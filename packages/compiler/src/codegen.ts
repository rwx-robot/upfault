/**
 * UpFault Compiler - Code Generator
 *
 * 把模板 AST **直译**为可直接执行的渲染函数：
 *
 *     export function render(_ctx, _cache) {
 *       return <VNode 表达式>;
 *     }
 *
 * 元素 → `h(tag, props, children)`，v-for → `.map()` 展开，v-if → 嵌套三元，
 * 事件 → 函数引用或内联箭头函数。
 *
 * ---------------------------------------------------------------------------
 * 历史缺陷（2026-09-23 定位并修复）
 *
 * 旧实现走 Block Tree 生成 `createElementVNode` / `createTextVNode` 调用，而这两个
 * API 在 `@upfault/runtime` 里**根本不存在**（runtime 只导出 `h/Fragment/Text/Comment`）；
 * 同时 `<li v-for>` 丢失 li 标签与 :key、`<p v-if>` 丢失 p 标签、`@click="dec"` 被
 * 生成成字符串字面量。产物从未被执行过 —— 既有测试只做 `toContain` 字符串断言，
 * 所以整条链路的缺陷长期潜伏（M6 生态工具链让产物第一次真的跑起来时暴露）。
 *
 * 对策有两层：
 *   1. 生成器直译 AST，只使用 runtime 真实存在的 API；
 *   2. 测试改为「编译 → 求值 → 挂载 → 断言真实 DOM」，见 codegen-exec.test.ts。
 * ---------------------------------------------------------------------------
 */

import { BlockGranularity, buildBlockTree, type BlockTreeResult } from './block-tree';
// parse 必须以值形式静态导入：此前这里用 require('./parser')，
// 在 ESM（Vite/vitest）环境下 require 未定义，compile() 会直接抛
// MODULE_NOT_FOUND —— 该缺陷使整个 compile() API 在 ESM 下不可用。
import {
  parse,
  DIRECTIVE_PROP_NAMES,
  type TemplateAST,
  type TemplateNode,
  type ElementNode,
  type TextNode,
  type InterpolationNode,
  type ComponentNode,
  type IfNode,
  type ForNode,
  type PropNode,
  type SourceLocation,
  type CompileContext,
  type ImportSpec,
  type CompileError,
  type CompileWarning,
} from './parser';

// ============================================================================
// 代码生成配置
// ============================================================================

export interface CodegenOptions {
  mode: 'module' | 'function';
  target: 'es2020' | 'es2015';
  sourceMap: boolean;
  filename: string;
  optimizeImports: boolean;
  hoistStatic: boolean;
  cacheHandlers: boolean;
  generateAnnotations: boolean; // 生成 DevTools 注解
}

export interface CodegenResult {
  code: string;
  ast: TemplateAST;
  imports: ImportSpec[];
  metadata: RenderMetadata;
  sourceMap?: string;
}

export interface RenderMetadata {
  blockTree: BlockTreeResult;
  componentName: string;
  templateHash: string;
  compileFlags: number;
  hasDynamicSlots: boolean;
  hasHoisted: boolean;
  helpers: string[];
}

/**
 * 生成 props 时需要跳过的编译期指令属性，从 parser 的指令集合派生。
 *
 * **排除 `key`**：v-for 的 `:key` 必须作为普通 prop 传给 `h()`，
 * 由 `h()` 内部提升为 `vnode.key`（见 `withKey`）。
 */
const CODEGEN_SKIP_PROPS = new Set([...DIRECTIVE_PROP_NAMES].filter((n) => n !== 'key'));

/** 可以在处理函数体内展开的事件修饰符（其余修饰符仅告警，不静默改变语义） */
const HANDLER_MODIFIERS = new Set(['stop', 'prevent', 'self']);

/** 运行时真实导出的 helper —— 生成器只会登记这里的名字 */
const RUNTIME_HELPERS = new Set(['h', 'Fragment', 'Text', 'Comment']);

// ============================================================================
// 渲染函数代码生成
// ============================================================================

export function generateRenderFunction(
  ast: TemplateAST,
  context: CompileContext,
  blockTree: BlockTreeResult,
  options: CodegenOptions = {
    mode: 'module',
    target: 'es2020',
    sourceMap: false,
    filename: 'anonymous.uf',
    optimizeImports: true,
    hoistStatic: true,
    cacheHandlers: true,
    generateAnnotations: true,
  }
): CodegenResult {
  const generator = new CodeGenerator(ast, context, blockTree, options);
  return generator.generate();
}

class CodeGenerator {
  private ast: TemplateAST;
  private context: CompileContext;
  private blockTree: BlockTreeResult;
  private options: CodegenOptions;
  private code: string[] = [];
  private helpers: Set<string> = new Set();

  /** 编译期绑定的名字：模板里裸写这些标识符时不做 `_ctx.` 改写 */
  private readonly locals: Set<string> = new Set([
    '_ctx', '_cache', '$event', '$props', '$slots', '$emit', '$attrs', '$refs',
  ]);

  /** 当前生效的 v-for 别名（嵌套时逐层入栈） */
  private forScopes: string[] = [];

  private static readonly RESERVED = new Set([
    'true', 'false', 'null', 'undefined', 'this', 'typeof', 'instanceof', 'void', 'delete',
    'in', 'of', 'new', 'return', 'if', 'else', 'for', 'while', 'do', 'switch', 'case',
    'break', 'continue', 'default', 'function', 'class', 'extends', 'super', 'try', 'catch',
    'finally', 'throw', 'yield', 'await', 'async', 'let', 'const', 'var', 'import', 'export',
    'from', 'as', 'with', 'debugger', 'static', 'get', 'set', 'enum',
  ]);

  private static readonly GLOBALS = new Set([
    'Math', 'JSON', 'Date', 'Array', 'Object', 'String', 'Number', 'Boolean', 'RegExp',
    'Map', 'Set', 'WeakMap', 'WeakSet', 'Promise', 'Symbol', 'BigInt', 'Error', 'TypeError',
    'RangeError', 'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'NaN', 'Infinity', 'console',
    'window', 'document', 'globalThis', 'encodeURIComponent', 'decodeURIComponent',
    'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'requestAnimationFrame',
    'cancelAnimationFrame', 'queueMicrotask', 'structuredClone', 'localStorage',
  ]);

  constructor(
    ast: TemplateAST,
    context: CompileContext,
    blockTree: BlockTreeResult,
    options: CodegenOptions
  ) {
    this.ast = ast;
    this.context = context;
    this.blockTree = blockTree;
    this.options = options;
  }

  generate(): CodegenResult {
    // 1. 生成渲染函数主体（过程中通过 useHelper() 登记实际用到的 helper）
    const body = this.emitRoot();

    // 2. imports 必须最后生成并前置到顶部：helper 依赖只有在主体代码
    //    生成完毕后才能确定。
    const importBlock = this.buildImports();
    if (importBlock) {
      this.code.push(importBlock, '');
    }

    this.code.push('export function render(_ctx, _cache) {', `  return ${body};`, '}');

    // 3. 生成 metadata
    const metadata = this.generateMetadata();

    return {
      code: this.code.join('\n'),
      ast: this.ast,
      imports: this.context.imports,
      metadata,
    };
  }

  /** 构造 import 区块（在主体代码生成之后调用） */
  private buildImports(): string {
    const lines: string[] = [];

    // 运行时 helper：只引入生成过程中实际用到的（useHelper 登记）
    const runtimeHelpers = Array.from(this.helpers)
      .filter((name) => RUNTIME_HELPERS.has(name))
      .sort();
    if (runtimeHelpers.length > 0) {
      lines.push(`import { ${runtimeHelpers.join(', ')} } from '@upfault/runtime';`);
    }

    // 用户导入（组件、工具函数）：来自各自的模块，**不是** runtime。
    // 旧实现把它们一律拼成 `import { X } from '@upfault/runtime'`。
    for (const imp of this.context.imports) {
      if (RUNTIME_HELPERS.has(imp.name)) continue;
      const spec = imp.as ? `${imp.name} as ${imp.as}` : imp.name;
      lines.push(`import { ${spec} } from '${imp.from}';`);
    }

    return lines.join('\n');
  }

  /** 登记运行时 helper 依赖（供按需 import 使用） */
  private useHelper(name: string): void {
    this.helpers.add(name);
  }

  private warn(node: { loc: SourceLocation }, message: string): void {
    this.context.warnings.push({ message, loc: node.loc, code: 'CODEGEN_UNSUPPORTED' });
  }

  // --------------------------------------------------------------------------
  // 发射器
  // --------------------------------------------------------------------------

  private h(args: string[]): string {
    this.useHelper('h');
    return `h(${args.join(', ')})`;
  }

  private fragment(childrenCode: string): string {
    this.useHelper('h');
    this.useHelper('Fragment');
    return `h(Fragment, null, ${childrenCode})`;
  }

  /** 根节点：单根直接返回，多根包 Fragment */
  private emitRoot(): string {
    const children = this.ast.children;
    const nodes = this.meaningfulChildren(children);
    if (nodes.length === 0) return 'null';
    if (nodes.length === 1) return this.emitNode(nodes[0]!);
    return this.fragment(this.emitChildren(children));
  }

  /**
   * 过滤注释与「无意义的空白文本」。
   *
   * parser 的 parseText 已经 `trim()` 过，缩进/换行都会变成空串，
   * 因此这里只需按 trim 结果判断，不会误伤有内容的文本。
   */
  private meaningfulChildren(children: TemplateNode[]): TemplateNode[] {
    return children.filter((child) => {
      if (child.type === 'Comment') return false;
      if (child.type === 'Text') return child.content.trim() !== '';
      return true;
    });
  }

  /** 子节点 → 数组字面量；v-for 以展开语法内联 */
  private emitChildren(children: TemplateNode[]): string {
    const parts: string[] = [];
    for (const child of this.meaningfulChildren(children)) {
      parts.push(child.type === 'For' ? this.emitForSpread(child) : this.emitNode(child));
    }
    return `[${parts.join(', ')}]`;
  }

  private emitNode(node: TemplateNode): string {
    switch (node.type) {
      case 'Element': {
        const el = node as ElementNode;
        // parser 不产出 SlotNode（`<slot>` 会走普通元素分支），这里按标签名兜底：
        // 插槽语义尚未支持，生成 null 占位比渲染一个游离的 <slot> 元素更诚实
        if (el.tag === 'slot') {
          this.warn(node, '<slot> 插槽尚未支持，已生成 null 占位');
          return 'null';
        }
        return this.emitTagCall(this.quote(el.tag), el.props, el.children, false);
      }
      case 'Component':
        return this.emitComponent(node as ComponentNode);
      case 'Text':
        // 模板里的换行 + 缩进折叠成单个空格（与 Vue 的空白压缩一致）
        return this.quote((node as TextNode).content.replace(/\s*\n\s*/g, ' '));
      case 'Interpolation':
        return this.rewrite((node as InterpolationNode).expression);
      case 'If':
        return this.emitIf(node as IfNode);
      case 'For':
        // 非数组位置的 v-for（例如 v-if 分支体）→ 包一层 Fragment
        return this.fragment(this.emitChildren([node]));
      case 'Slot':
        this.warn(node, '<slot> 插槽尚未支持，已生成 null 占位');
        return 'null';
      default:
        this.warn(node, `不支持的节点类型 ${node.type}，已生成 null 占位`);
        return 'null';
    }
  }

  /**
   * 组件引用解析：模板里 `<Child>` → `_ctx.Child`。
   *
   * 组件对象由 `setup()` 返回（`return { Child }`），与「模板只读 _ctx」的
   * 模型保持一致；若编译器已收到同名用户导入，则直接用裸标识符。
   */
  private emitComponent(node: ComponentNode): string {
    const ident = this.componentIdentifier(node.name);
    const imported = this.context.imports.some((i) => i.name === ident || i.as === ident);
    const expr = imported ? ident : `_ctx.${ident}`;
    return this.emitTagCall(expr, node.props, node.children, true);
  }

  /** 标签名 → 模块作用域标识符：`<my-child>` → `MyChild`（与 Vue 一致） */
  private componentIdentifier(name: string): string {
    if (!name.includes('-')) return name;
    return name
      .split('-')
      .filter(Boolean)
      .map((s) => s[0]!.toUpperCase() + s.slice(1))
      .join('');
  }

  private emitTagCall(
    tagExpr: string,
    props: PropNode[],
    children: TemplateNode[],
    isComponent: boolean
  ): string {
    const args = [tagExpr, this.emitProps(props, isComponent) || 'null'];
    if (this.meaningfulChildren(children).length > 0) {
      args.push(this.emitChildren(children));
    }
    return this.h(args);
  }

  private emitProps(props: PropNode[], isComponent: boolean): string {
    const entries: string[] = [];

    for (const prop of props) {
      if (CODEGEN_SKIP_PROPS.has(prop.name)) continue;

      // 事件：@click → onClick
      if (prop.isEvent) {
        const handler = `on${prop.name[0]!.toUpperCase()}${prop.name.slice(1)}`;
        entries.push(`${this.quote(handler)}: ${this.emitHandler(prop)}`);
        continue;
      }

      // v-model：元素 → value + onInput；组件 → modelValue + onUpdate:modelValue
      if (prop.name === 'model' || prop.name === 'v-model') {
        const expr = prop.value ? String(prop.value.value).trim() : '';
        if (!expr) {
          this.warn(prop, 'v-model 缺少绑定目标，已忽略');
          continue;
        }
        const target = this.rewrite(expr);
        if (isComponent) {
          entries.push(`modelValue: ${target}`);
          entries.push(`${this.quote('onUpdate:modelValue')}: ($event) => { ${target} = $event; }`);
        } else {
          entries.push(`value: ${target}`);
          entries.push(`onInput: ($event) => { ${target} = $event.target.value; }`);
        }
        continue;
      }

      if (prop.isDirective) {
        this.warn(prop, `v-${prop.name} 指令尚未支持，已忽略`);
        continue;
      }

      const key = this.quote(prop.name);
      if (prop.value === null || prop.value === undefined) {
        // 布尔简写：<input disabled /> → { disabled: true }
        entries.push(`${key}: true`);
      } else if (prop.isDynamic) {
        // parser 把动态值也标成 Literal（value 即表达式原文），按 isDynamic 取义
        entries.push(`${key}: ${this.rewrite(String(prop.value.value))}`);
      } else {
        entries.push(`${key}: ${this.quote(String(prop.value.value))}`);
      }
    }

    return entries.length ? `{ ${entries.join(', ')} }` : '';
  }

  /**
   * 事件处理：
   * - `@click="dec"` / `@click="form.submit"` → 直接引用（`_ctx.dec`）
   * - 其余（`count++`、`toggle(t.id)`）→ 内联箭头函数包裹
   * - `.stop` / `.prevent` / `.self` 在函数体内展开
   */
  private emitHandler(prop: PropNode): string {
    const raw = prop.value ? String(prop.value.value).trim() : '';
    const allMods = prop.eventModifiers ?? [];

    for (const mod of allMods) {
      if (!HANDLER_MODIFIERS.has(mod)) {
        this.warn(prop, `@${prop.name}.${mod} 修饰符尚未支持，已忽略`);
      }
    }
    const mods = allMods.filter((m) => HANDLER_MODIFIERS.has(m));

    const isPlainReference = /^[A-Za-z_$][\w$]*(\.[\w$]+)*$/.test(raw);
    if (mods.length === 0 && isPlainReference) return this.rewrite(raw);
    if (!raw) this.warn(prop, `@${prop.name} 缺少处理函数，已生成空函数`);

    return `($event) => { ${this.applyModifiers(raw, mods)} }`;
  }

  private applyModifiers(raw: string, mods: string[]): string {
    const statements: string[] = [];
    if (mods.includes('self')) statements.push('if ($event.target !== $event.currentTarget) return;');
    if (mods.includes('stop')) statements.push('$event.stopPropagation();');
    if (mods.includes('prevent')) statements.push('$event.preventDefault();');
    if (raw) {
      const expr = this.rewrite(raw).replace(/;+$/, '');
      // 有修饰符时处理函数被包进箭头函数体，语句位置**必须调用**：
      // `@submit.prevent="add"` 的语义是「提交时调用 add」，
      // 只写 `_ctx.add` 会求值成一个函数引用后丢弃（此前正是这个缺陷，
      // 表现为带修饰符的事件静默失效）。
      const isPlainReference = /^[A-Za-z_$][\w$]*(\.[\w$]+)*$/.test(raw);
      statements.push(isPlainReference ? `${expr}();` : `${expr};`);
    }
    return statements.join(' ');
  }

  /** 分支链 → 嵌套三元表达式（无 else 时以 null 兜底） */
  private emitIf(node: IfNode): string {
    let out = 'null';
    for (let i = node.branches.length - 1; i >= 0; i--) {
      const branch = node.branches[i]!;
      const body = this.emitBranchBody(branch.children);
      out = branch.condition === null ? body : `${this.rewrite(branch.condition)} ? ${body} : ${out}`;
    }
    return out;
  }

  private emitBranchBody(children: TemplateNode[]): string {
    const nodes = this.meaningfulChildren(children);
    if (nodes.length === 0) return 'null';
    if (nodes.length === 1) return this.emitNode(nodes[0]!);
    return this.fragment(this.emitChildren(children));
  }

  /** v-for → `...<source>.map((alias, index) => <host>)` */
  private emitForSpread(node: ForNode): string {
    const host = node.children.find((c) => c.type === 'Element' || c.type === 'Component');
    if (!host) {
      this.warn(node, 'v-for 缺少可循环的宿主元素，已生成 null 占位');
      return 'null';
    }
    // 别名必须是单个标识符（v-for 解构语法尚未支持），且 source 必须已由
    // parser 解析成右侧表达式（仍含 `in` / `of` 说明 parseForExpression 没认出）
    if (
      !/^[A-Za-z_$][\w$]*$/.test(node.value) ||
      /\s(?:in|of)\s/.test(node.source)
    ) {
      this.warn(node, `v-for 表达式无法解析（${node.source}），已生成 null 占位（暂不支持解构型别名）`);
      return 'null';
    }

    this.forScopes.push(node.value);
    if (node.indexAlias) this.forScopes.push(node.indexAlias);
    let body: string;
    try {
      body = this.emitNode(this.withKey(host, node.key));
    } finally {
      if (node.indexAlias) this.forScopes.pop();
      this.forScopes.pop();
    }

    const params = node.indexAlias ? `(${node.value}, ${node.indexAlias})` : `(${node.value})`;
    return `...${this.rewrite(node.source)}.map(${params} => ${body})`;
  }

  /**
   * 宿主元素的 `:key` 在 parser 里被提升为 `ForNode.key`（并已从 props 剥离），
   * 这里再作为普通 prop 注入回去 —— `h()` 会把它提升为 `vnode.key`。
   */
  private withKey(host: TemplateNode, key: string | null): TemplateNode {
    if (!key) return host;
    const keyProp: PropNode = {
      type: 'Prop',
      name: 'key',
      value: { type: 'Literal', value: key },
      isDynamic: true,
      isEvent: false,
      isDirective: false,
      eventModifiers: [],
      loc: host.loc,
    };
    const props = ((host as ElementNode).props ?? []).concat(keyProp);
    return { ...host, props } as TemplateNode;
  }

  // --------------------------------------------------------------------------
  // 标识符改写
  // --------------------------------------------------------------------------

  /**
   * 自由标识符改写：模板表达式里裸写的标识符一律视为组件状态（`_ctx.x`）。
   *
   * 不改写：属性访问的右半（`a.b` 的 `b`）、对象字面量键、箭头函数参数、
   * JS 保留字与全局对象、编译期局部名（`_ctx` / `$event`）、v-for 别名、
   * 以及任何以 `_` 开头的标识符（约定：下划线开头表示模块作用域）。
   * 字符串字面量先屏蔽再还原，避免误改字符串内容。
   */
  private rewrite(code: string): string {
    if (!code) return code;

    const literals: string[] = [];
    const masked = code.replace(/(['"`])(?:\\.|(?!\1)[^\\])*\1/g, (m) => {
      literals.push(m);
      return `\u0000${literals.length - 1}\u0000`;
    });

    const arrowParams = this.collectArrowParams(masked);

    let out = '';
    let last = 0;
    const re = /[A-Za-z_$][A-Za-z0-9_$]*/g;
    let m: RegExpExecArray | null;

    while ((m = re.exec(masked)) !== null) {
      const id = m[0];
      const start = m.index;

      let p = start - 1;
      while (p >= 0 && /\s/.test(masked[p]!)) p--;
      const prev = p >= 0 ? masked[p]! : '';

      let q = start + id.length;
      while (q < masked.length && /\s/.test(masked[q]!)) q++;
      const next = q < masked.length ? masked[q]! : '';

      const afterDot = prev === '.' || (prev === '?' && masked[p - 1] === '.');
      const objectKey = next === ':' && (prev === '' || prev === '{' || prev === ',');
      const skip =
        afterDot ||
        objectKey ||
        CodeGenerator.RESERVED.has(id) ||
        CodeGenerator.GLOBALS.has(id) ||
        this.locals.has(id) ||
        this.forScopes.includes(id) ||
        arrowParams.has(id) ||
        id.startsWith('_');

      out += masked.slice(last, start);
      out += skip ? id : `_ctx.${id}`;
      last = start + id.length;
    }
    out += masked.slice(last);

    return out.replace(/\u0000(\d+)\u0000/g, (_s, i: string) => literals[Number(i)] ?? '');
  }

  /**
   * 收集表达式里箭头函数的形参名，避免 `items.filter(x => x.done)`
   * 被改写成 `_ctx.items.filter(_ctx.x => _ctx.x.done)`。
   *
   * 支持 `x => ` 与 `(a, b) => ` 两种形态（含解构参数 —— 括号内标识符
   * 全部视为形参，这对模板场景足够）。
   */
  private collectArrowParams(masked: string): Set<string> {
    const names = new Set<string>();
    const re = /=>/g;
    let m: RegExpExecArray | null;

    while ((m = re.exec(masked)) !== null) {
      let i = m.index - 1;
      while (i >= 0 && /\s/.test(masked[i]!)) i--;
      if (i < 0) continue;

      if (masked[i] === ')') {
        let depth = 0;
        let j = i;
        for (; j >= 0; j--) {
          if (masked[j] === ')') depth++;
          else if (masked[j] === '(') {
            depth--;
            if (depth === 0) break;
          }
        }
        for (const id of masked.slice(j + 1, i).match(/[A-Za-z_$][\w$]*/g) ?? []) {
          names.add(id);
        }
      } else {
        const single = /[A-Za-z_$][\w$]*$/.exec(masked.slice(0, i + 1));
        if (single) names.add(single[0]);
      }
    }

    return names;
  }

  // --------------------------------------------------------------------------
  // Metadata
  // --------------------------------------------------------------------------

  private generateMetadata(): RenderMetadata {
    return {
      blockTree: this.blockTree,
      componentName: this.extractComponentName(),
      templateHash: this.hashTemplate(this.ast.source),
      compileFlags: this.blockTree.rootBlock.compileFlags,
      hasDynamicSlots: this.blockTree.rootBlock.hasSlot,
      // 静态提升尚未实现：生成器当前不产出 hoisted 常量
      hasHoisted: false,
      helpers: Array.from(this.helpers).sort(),
    };
  }

  private extractComponentName(): string {
    const match = this.options.filename.match(/([^/]+)\.uf$/);
    return match && match[1] ? match[1] : 'Anonymous';
  }

  private hashTemplate(source: string): string {
    let hash = 0x811c9dc5;
    for (let i = 0; i < source.length; i++) {
      hash ^= source.charCodeAt(i);
      hash = (hash * 0x01000193) >>> 0;
    }
    return `0x${(hash >>> 0).toString(16).padStart(8, '0')}`;
  }

  private quote(str: string): string {
    return JSON.stringify(str);
  }
}

// ============================================================================
// 完整编译流水线
// ============================================================================

export interface CompilerOptions {
  filename: string;
  sourceMap?: boolean;
  hoistStatic?: boolean;
  cacheHandlers?: boolean;
  granularity?: BlockGranularity;
  devTools?: boolean;
}

export interface CompilerResult {
  code: string;
  ast: TemplateAST;
  blockTree: BlockTreeResult;
  metadata: RenderMetadata;
  sourceMap?: string;
  errors: CompileError[];
  warnings: CompileWarning[];
}

export function compile(template: string, options: CompilerOptions): CompilerResult {
  // 1. Parse（静态导入，见文件头说明）
  const { ast, context } = parse(template, {
    filename: options.filename,
    sourceMap: options.sourceMap,
  });

  // 2. Build Block Tree（供 metadata / DevTools / 优化器使用；
  //    渲染代码本身不再依赖它 —— 见文件头的缺陷说明）
  const blockTree = buildBlockTree(ast, context, {
    // BlockGranularity 是 const enum，必须引用枚举成员而非字符串字面量
    granularity: options.granularity ?? BlockGranularity.Medium,
    maxBlockDepth: 10,
    enableFineGrained: true,
  });

  // 3. Generate Code
  const result = generateRenderFunction(ast, context, blockTree, {
    mode: 'module',
    target: 'es2020',
    sourceMap: options.sourceMap || false,
    filename: options.filename,
    optimizeImports: true,
    hoistStatic: options.hoistStatic !== false,
    cacheHandlers: options.cacheHandlers !== false,
    generateAnnotations: options.devTools !== false,
  });

  return {
    code: result.code,
    ast: result.ast,
    blockTree: result.metadata.blockTree,
    metadata: result.metadata,
    errors: context.errors,
    warnings: context.warnings,
  };
}

// 重新导出类型
export type { TemplateAST, CompileContext, ImportSpec, CompileError, CompileWarning } from './parser';
export type { BlockTreeResult, Block, BlockNode } from './block-tree';
