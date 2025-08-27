/**
 * @upfault/vite-plugin —— `.uf` 单文件组件的 Vite 集成
 *
 * 职责（只做这三件事，编译本身由 @upfault/compiler 负责）：
 *
 *   1. `transform`：`.uf` → 可执行 ESM 模块（含 `export default` 组件对象）
 *   2. 样式块：以 `?upfault-style=<i>&lang.css` 虚拟请求交给 Vite 的 CSS 管道，
 *      因此 `<style>` 自动获得 Vite 的 CSS 处理（注入、压缩、HMR、PostCSS）
 *   3. HMR：`.uf` 变更触发整页刷新
 *
 * 用法：
 *
 *     import { defineConfig } from 'vite';
 *     import upfault from '@upfault/vite-plugin';
 *
 *     export default defineConfig({ plugins: [upfault()] });
 *
 * 已知边界（v1，未支持项一律显式告警，不静默降级）：
 *   - `<script setup>` / `<style scoped>` 尚未支持
 *   - HMR 为整页刷新，未做组件级热替换
 */

import fs from 'node:fs';
import type { Plugin } from 'vite';
import { compileSFC, parseSFC, type SFCCompileResult, type ScriptPayload } from '@upfault/compiler';

export interface UpfaultPluginOptions {
  /** 参与编译的文件匹配（默认 /\.uf$/） */
  include?: RegExp | RegExp[];
  /** 是否用 Vite 自带的 esbuild 转译 `<script lang="ts">`（默认 true） */
  transpileScript?: boolean;
  /** 自定义脚本块转译钩子，优先于内置 TS 转译 */
  scriptTransform?: (script: ScriptPayload) => string;
}

/** 样式虚拟请求：`/abs/Comp.uf?upfault-style=0` */
const STYLE_QUERY = '?upfault-style=';
const STYLE_RE = /\?upfault-style=(\d+)/;

const TS_LANGS = new Set(['ts', 'tsx', 'typescript']);

function toArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

/**
 * 预转译脚本块。
 *
 * `compileSFC` 的 `scriptTransform` 钩子是**同步**的（编译器刻意不依赖
 * Vite/esbuild，保持可独立测试），而 Vite 的 `transformWithEsbuild` 是异步的，
 * 因此在进入 compileSFC 之前先把脚本块转译好，再用同步钩子回放结果。
 */
export async function preTranspileScript(
  id: string,
  source: string,
  options: UpfaultPluginOptions = {}
): Promise<((script: ScriptPayload) => string) | undefined> {
  if (options.scriptTransform) return options.scriptTransform;

  const script = parseSFC(source, { filename: id }).script;
  const lang = script?.attrs['lang'] ?? null;
  if (!script || !lang || !TS_LANGS.has(lang)) return undefined;
  if (options.transpileScript === false) return undefined;

  const { transformWithEsbuild } = await import('vite');
  const transpiled = await transformWithEsbuild(script.content, `${id}.${lang}`, {
    loader: lang === 'tsx' ? 'tsx' : 'ts',
    target: 'es2020',
  });

  return () => transpiled.code;
}

export default function upfault(options: UpfaultPluginOptions = {}): Plugin {
  const patterns = toArray(options.include);
  const matchers = patterns.length > 0 ? patterns : [/\.uf$/];

  /** 干净的 `.uf` 文件路径（排除样式虚拟请求） */
  const isSfc = (id: string): boolean => !id.includes('?') && matchers.some((re) => re.test(id));

  const formatDiag = (id: string, message: string, loc?: { line: number; column: number }): string =>
    loc ? `${id}:${loc.line}:${loc.column} ${message}` : `${id} ${message}`;

  return {
    name: 'upfault',
    // 必须在 Vite 内建转换之前接管 .uf，否则会被当成静态资源
    enforce: 'pre',

    resolveId(id) {
      // 样式虚拟请求统一交给 Vite 的 CSS 管道：
      // 追加 `&lang.css` 是本插件与 Vite 约定的「这是 CSS」标记
      if (STYLE_RE.test(id)) return `${id}&lang.css`;
      return null;
    },

    load(id) {
      const m = STYLE_RE.exec(id);
      if (!m) return null;
      const file = id.split('?')[0]!;
      const style = parseSFC(fs.readFileSync(file, 'utf8'), { filename: file }).styles[Number(m[1])];
      return style ? style.content : '';
    },

    async transform(code, id) {
      if (!isSfc(id)) return null;

      const scriptTransform = await preTranspileScript(id, code, options);
      const result: SFCCompileResult = compileSFC(code, { filename: id, scriptTransform });

      for (const warning of result.warnings) {
        this.warn({ message: formatDiag(id, warning.message, warning.loc.start) });
      }
      for (const error of result.errors) {
        this.error({ message: formatDiag(id, error.message, error.loc.start) });
      }

      // 样式块以副作用 import 注入，Vite 负责实际处理与 HMR
      const styleImports = result.styles
        .map((style) => `import ${JSON.stringify(`${id}${STYLE_QUERY}${style.index}`)};`)
        .join('\n');

      return {
        code: styleImports ? `${styleImports}\n\n${result.code}` : result.code,
        map: null,
      };
    },

    /**
     * HMR：v1 采用整页刷新。
     *
     * `.uf` 编译产物的组件对象在模块求值时就固定了 render，模块级热替换不会
     * 让已挂载的应用重新渲染；与其假装支持组件级 HMR，不如刷新整个页面。
     */
    handleHotUpdate(ctx) {
      if (!isSfc(ctx.file)) return;
      ctx.server.ws.send({ type: 'full-reload' });
      return [];
    },
  };
}
