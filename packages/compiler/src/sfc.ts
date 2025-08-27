/**
 * `.uf` 单文件组件（SFC）解析与编译
 *
 * 一个 `.uf` 文件由三类顶层块组成（顺序不限、`<style>` 可重复）：
 *
 *     <template>…模板…</template>
 *     <script>export default { setup() { … } }</script>
 *     <style>…</style>
 *
 * 编译产物是一个普通 ESM 模块：
 *
 *     import { h } from '@upfault/runtime';
 *     export function render(_ctx, _cache) { … }
 *     const __upfault_component = { setup() { … } };   // 来自 <script>
 *     const __upfault_sfc = __upfault_component;
 *     __upfault_sfc.render = render;
 *     export default __upfault_sfc;
 *
 * 因此 `import Counter from './Counter.uf'` 拿到的就是一个可直接交给
 * `h()` / `createRenderer().render()` 的组件对象。
 *
 * 本模块刻意不依赖 Vite/esbuild：脚本块的 TS 转译由调用方通过
 * `scriptTransform` 注入（见 @upfault/vite-plugin），保持编译器可独立测试。
 */

import { compile, type CompilerOptions, type RenderMetadata } from './codegen';
import type { CompileError, CompileWarning, Position, SourceLocation } from './parser';

// ============================================================================
// 类型
// ============================================================================

export interface SFCBlock {
  /** 块内容（不含标签本身） */
  content: string;
  /** 标签上的属性，例如 { lang: 'ts' } / { scoped: '' } */
  attrs: Record<string, string>;
  loc: SourceLocation;
}

export interface SFCStyleBlock extends SFCBlock {
  index: number;
  scoped: boolean;
  lang: string | null;
}

export interface SFCParseOptions {
  filename?: string;
}

export interface SFCParseResult {
  filename: string;
  template: SFCBlock | null;
  script: SFCBlock | null;
  styles: SFCStyleBlock[];
  errors: CompileError[];
  warnings: CompileWarning[];
}

export interface ScriptPayload {
  code: string;
  /** `<script lang="…">` 的 lang，未声明时为 null */
  lang: string | null;
  filename: string;
}

export interface SFCCompileOptions {
  filename: string;
  sourceMap?: boolean;
  granularity?: CompilerOptions['granularity'];
  /** 脚本块转译钩子（TS → JS）；抛错会被收集为编译错误 */
  scriptTransform?: (script: ScriptPayload) => string;
}

export interface SFCCompileResult {
  /** 完整 ESM 模块代码 */
  code: string;
  /** 仅渲染函数片段（调试 / 工具链用） */
  render: string;
  componentName: string;
  template: SFCBlock | null;
  script: SFCBlock | null;
  styles: SFCStyleBlock[];
  metadata: RenderMetadata;
  errors: CompileError[];
  warnings: CompileWarning[];
}

// ============================================================================
// 块扫描
// ============================================================================

/** 组件内实现的标识符，脚本块中的 `export default` 会被改写为它 */
export const SFC_COMPONENT_IDENT = '__upfault_component';
/** 最终默认导出的组件对象标识符 */
export const SFC_EXPORT_IDENT = '__upfault_sfc';

/**
 * 顶层块匹配。
 *
 * 注意：模板中嵌套的 `<template>`（如 `<template v-if>` 插槽模板）不受支持，
 * 非贪婪匹配会停在第一个 `</template>`；这里在解析阶段给出告警而不是静默截断。
 */
const BLOCK_RE = /<(template|script|style)((?:\s[^>]*)?)>([\s\S]*?)<\/\1\s*>/g;

function offsetToPosition(source: string, offset: number): Position {
  let line = 1;
  let lineStart = 0;
  for (let i = 0; i < offset && i < source.length; i++) {
    if (source[i] === '\n') {
      line++;
      lineStart = i + 1;
    }
  }
  return { offset, line, column: offset - lineStart + 1 };
}

function makeLoc(source: string, start: number, end: number): SourceLocation {
  return {
    start: offsetToPosition(source, start),
    end: offsetToPosition(source, end),
    source: source.slice(start, end),
  };
}

/** 解析标签属性文本：`lang="ts" scoped` → { lang: 'ts', scoped: '' } */
function parseAttrs(attrText: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const re = /([A-Za-z_:@][\w:.-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(attrText)) !== null) {
    const name = m[1]!;
    const value = m[2] ?? m[3] ?? m[4] ?? '';
    attrs[name] = value;
  }
  return attrs;
}

/**
 * 扫描 SFC 顶层块。
 *
 * `<script setup>` 与重复的 `<template>` / `<script>` 会产出告警或错误，
 * 不会被静默忽略 —— 静默忽略会让用户以为代码生效了。
 */
export function parseSFC(source: string, options: SFCParseOptions = {}): SFCParseResult {
  const filename = options.filename ?? 'anonymous.uf';
  const errors: CompileError[] = [];
  const warnings: CompileWarning[] = [];

  let template: SFCBlock | null = null;
  let script: SFCBlock | null = null;
  const styles: SFCStyleBlock[] = [];

  BLOCK_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = BLOCK_RE.exec(source)) !== null) {
    const tag = m[1]!;
    const attrs = parseAttrs(m[2] ?? '');
    const openTagEnd = m.index + m[0].indexOf('>') + 1;
    const content = m[3] ?? '';
    const loc = makeLoc(source, openTagEnd, openTagEnd + content.length);

    if (tag === 'style') {
      styles.push({
        content,
        attrs,
        loc,
        index: styles.length,
        scoped: 'scoped' in attrs,
        lang: attrs['lang'] ?? null,
      });
      continue;
    }

    if (attrs['setup'] !== undefined) {
      warnings.push({
        message: '<script setup> 尚未支持，请改用 <script> + export default { setup() { … } }',
        loc: makeLoc(source, m.index, openTagEnd),
        code: 'SFC_SCRIPT_SETUP_UNSUPPORTED',
      });
      continue;
    }

    if (tag === 'template') {
      if (attrs['lang'] && attrs['lang'] !== 'html') {
        warnings.push({
          message: `<template lang="${attrs['lang']}"> 尚未支持，仅支持 HTML 模板`,
          loc: makeLoc(source, m.index, openTagEnd),
          code: 'SFC_TEMPLATE_LANG_UNSUPPORTED',
        });
      }
      if (template) {
        errors.push({
          message: '重复的 <template> 块',
          loc: makeLoc(source, m.index, openTagEnd),
          code: 'SFC_DUPLICATE_TEMPLATE',
        });
        continue;
      }
      template = { content, attrs, loc };
      continue;
    }

    // script
    if (script) {
      errors.push({
        message: '重复的 <script> 块',
        loc: makeLoc(source, m.index, openTagEnd),
        code: 'SFC_DUPLICATE_SCRIPT',
      });
      continue;
    }
    script = { content, attrs, loc };
  }

  if (!template && !script) {
    errors.push({
      message: 'SFC 缺少 <template> 与 <script> 块',
      loc: makeLoc(source, 0, 0),
      code: 'SFC_EMPTY',
    });
  }

  return { filename, template, script, styles, errors, warnings };
}

// ============================================================================
// 编译
// ============================================================================

/**
 * 脚本块中的 `export default` 改写为具名常量声明。
 * 返回 `rewritten=false` 表示脚本没有默认导出，调用方需补一个空对象占位。
 */
function rewriteDefaultExport(code: string): { code: string; rewritten: boolean } {
  const re = /\bexport\s+default\b/;
  if (!re.test(code)) return { code, rewritten: false };
  return { code: code.replace(re, `const ${SFC_COMPONENT_IDENT} =`), rewritten: true };
}

/** 去掉脚本块首尾的缩进与空行，让产物可读 */
function trimBlock(content: string): string {
  return content.replace(/^\s*\n/, '').replace(/\s*$/, '');
}

export function compileSFC(source: string, options: SFCCompileOptions): SFCCompileResult {
  const parsed = parseSFC(source, { filename: options.filename });
  const errors: CompileError[] = [...parsed.errors];
  const warnings: CompileWarning[] = [...parsed.warnings];

  const templateSource = parsed.template?.content ?? '';
  const compiled = compile(templateSource, {
    filename: options.filename,
    sourceMap: options.sourceMap,
    granularity: options.granularity,
  });
  errors.push(...compiled.errors);
  warnings.push(...compiled.warnings);

  // 脚本块：转译（可选）→ 改写默认导出
  let scriptCode = '';
  let hasDefaultExport = false;
  if (parsed.script) {
    const raw = trimBlock(parsed.script.content);
    const lang = parsed.script.attrs['lang'] ?? null;
    let transformed = raw;
    if (options.scriptTransform) {
      try {
        transformed = options.scriptTransform({ code: raw, lang, filename: options.filename });
      } catch (err) {
        errors.push({
          message: `<script> 块转译失败：${(err as Error).message}`,
          loc: parsed.script.loc,
          code: 'SFC_SCRIPT_TRANSFORM_FAILED',
        });
      }
    }
    const rewritten = rewriteDefaultExport(transformed);
    scriptCode = rewritten.code;
    hasDefaultExport = rewritten.rewritten;
  }

  const hasTemplate = parsed.template !== null;
  if (!hasTemplate && !/\brender\b/.test(scriptCode)) {
    errors.push({
      message: 'SFC 无 <template>，且 <script> 未声明 render —— 组件无法渲染',
      loc: parsed.script?.loc ?? makeLoc(source, 0, 0),
      code: 'SFC_NO_RENDER',
    });
  }

  for (const style of parsed.styles) {
    if (style.scoped) {
      warnings.push({
        message: '<style scoped> 作用域样式尚未支持，样式将全局生效',
        loc: style.loc,
        code: 'SFC_SCOPED_STYLE_UNSUPPORTED',
      });
    }
    if (style.lang && style.lang !== 'css') {
      warnings.push({
        message: `<style lang="${style.lang}"> 需要对应的预处理器，插件会原样交给 Vite 处理`,
        loc: style.loc,
        code: 'SFC_STYLE_LANG',
      });
    }
  }

  const lines: string[] = [compiled.code, ''];

  if (scriptCode) {
    lines.push(scriptCode, '');
  }
  if (!hasDefaultExport) {
    lines.push(`const ${SFC_COMPONENT_IDENT} = {};`, '');
  }

  lines.push(
    `const ${SFC_EXPORT_IDENT} = ${SFC_COMPONENT_IDENT} && typeof ${SFC_COMPONENT_IDENT} === 'object' ? ${SFC_COMPONENT_IDENT} : {};`
  );
  if (hasTemplate) {
    // 模板即渲染来源（与 Vue 的 <template> 语义一致）；无模板时保留脚本自带的 render
    lines.push(`${SFC_EXPORT_IDENT}.render = render;`);
  }
  lines.push(`export default ${SFC_EXPORT_IDENT};`);

  return {
    code: lines.join('\n'),
    render: compiled.code,
    componentName: compiled.metadata.componentName,
    template: parsed.template,
    script: parsed.script,
    styles: parsed.styles,
    metadata: compiled.metadata,
    errors,
    warnings,
  };
}
