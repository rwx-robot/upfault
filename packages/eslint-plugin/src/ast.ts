/**
 * ESLint 自定义 AST 契约
 *
 * `.uf` 文件被解析成一颗「脚本 ESTree + 模板自定义节点」的混合 AST：
 *
 *     Program
 *     ├── body[]          ← <script> 块，标准 ESTree（可被任意 JS/TS 规则消费）
 *     └── templateBody[]  ← <template> 块，下列 UF* 节点
 *
 * **模板表达式刻意不建成 ESTree 节点**：它们只以原文文本 + 精确位置存在
 * （`UFExpression`）。若把 `{{ count }}` 变成真正的 Identifier，
 * `no-undef` 会把模板里所有绑定都判成未定义（运行时是通过 `_ctx` 代理解析的），
 * 造成成片假阳性。需要 AST 的规则自行 `parseExpression()`。
 */

/** ESLint 位置：行 1-based、列 0-based */
export interface LintPosition {
  line: number;
  column: number;
}

export interface LintLoc {
  start: LintPosition;
  end: LintPosition;
}

export type LintRange = [number, number];

/** 模板里的一个表达式：原文 + 它在 `.uf` 文件中的精确位置 */
export interface UFExpression {
  /** 表达式原文（已 trim，与编译器 parser 的语义一致） */
  raw: string;
  loc: LintLoc;
  range: LintRange;
  /** 可见的 v-for 迭代变量（含 index 别名），用于屏蔽局部名 */
  locals: string[];
}

export type UFDirectiveKind = 'static' | 'dynamic' | 'event' | 'directive';

export interface UFAttribute {
  /** 裸名：`class` / `click` / `if` / `for` / `key` / `model` / `else-if` */
  name: string;
  /** `:class` / `@click.prevent` / `v-for` / `class` —— 原文写法 */
  raw: string;
  kind: UFDirectiveKind;
  modifiers: string[];
  /** 静态字面量文本、表达式原文，或 null（布尔简写） */
  value: string | null;
  /** 动态/事件/指令的表达式；静态属性为 null */
  valueExpression: UFExpression | null;
  loc: LintLoc;
  range: LintRange;
}

interface UFNodeBase {
  loc: LintLoc;
  range: LintRange;
}

export interface UFElement extends UFNodeBase {
  type: 'UFElement';
  tag: string;
  attributes: UFAttribute[];
  children: UFTemplateNode[];
}

export interface UFComponent extends UFNodeBase {
  type: 'UFComponent';
  name: string;
  attributes: UFAttribute[];
  children: UFTemplateNode[];
}

export interface UFIfBranch extends UFNodeBase {
  /** null = v-else */
  condition: UFExpression | null;
  children: UFTemplateNode[];
}

export interface UFIf extends UFNodeBase {
  type: 'UFIf';
  branches: UFIfBranch[];
}

export interface UFFor extends UFNodeBase {
  type: 'UFFor';
  source: UFExpression;
  value: string;
  indexAlias: string | null;
  /** `:key` 的表达式；null = 未声明 key */
  key: UFExpression | null;
  children: UFTemplateNode[];
}

export interface UFInterpolation extends UFNodeBase {
  type: 'UFInterpolation';
  expression: UFExpression;
}

export interface UFText extends UFNodeBase {
  type: 'UFText';
  value: string;
}

export interface UFComment extends UFNodeBase {
  type: 'UFComment';
  value: string;
}

export type UFTemplateNode =
  | UFElement
  | UFComponent
  | UFIf
  | UFFor
  | UFInterpolation
  | UFText
  | UFComment;

/** 元素 / 组件节点（承载属性和 children 的两类节点） */
export type UFHostNode = UFElement | UFComponent;

export function isHostNode(node: UFTemplateNode): node is UFHostNode {
  return node.type === 'UFElement' || node.type === 'UFComponent';
}

/**
 * 判断「同一元素上同时写了 v-if 与 v-for」。
 *
 * 编译器把两个指令折成 `If(branches[0].children = [For(host)])`，
 * 且 If / For 的 loc 都取宿主元素自身的 loc —— 因此 **range 完全相同**
 * 就是「同一元素」的判定依据（正常嵌套时内层 For 的 range 必是真子集）。
 */
export function isSameElement(ifNode: UFIf, forNode: UFFor): boolean {
  return ifNode.range[0] === forNode.range[0] && ifNode.range[1] === forNode.range[1];
}
