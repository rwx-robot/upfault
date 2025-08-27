/**
 * UpFault Compiler - Template Parser
 * 
 * 解析 .uf 单文件组件模板，生成 AST
 * 支持：插值、指令、事件、插槽、组件、控制流
 */

import type { VNodeFlags, VNodeType } from '@upfault/shared';

// ============================================================================
// AST 节点类型
// ============================================================================

export interface TemplateAST {
  type: 'Template';
  children: TemplateNode[];
  source: string;
}

export type TemplateNode = 
  | ElementNode 
  | TextNode 
  | InterpolationNode 
  | CommentNode
  | ComponentNode
  | SlotNode
  | IfNode
  | ForNode;

export interface BaseNode {
  type: string;
  loc: SourceLocation;
}

export interface SourceLocation {
  start: Position;
  end: Position;
  source: string;
}

export interface Position {
  offset: number;
  line: number;
  column: number;
}

export interface ElementNode extends BaseNode {
  type: 'Element';
  tag: string;
  props: PropNode[];
  children: TemplateNode[];
  isSelfClosing: boolean;
  isComponent: boolean;
  componentName?: string;
}

export interface TextNode extends BaseNode {
  type: 'Text';
  content: string;
}

export interface InterpolationNode extends BaseNode {
  type: 'Interpolation';
  expression: string;
}

export interface CommentNode extends BaseNode {
  type: 'Comment';
  content: string;
}

export interface ComponentNode extends BaseNode {
  type: 'Component';
  name: string;
  props: PropNode[];
  children: TemplateNode[];
  isSelfClosing: boolean;
}

export interface SlotNode extends BaseNode {
  type: 'Slot';
  name: string | null; // null = default slot
  fallback: TemplateNode[];
}

export interface IfNode extends BaseNode {
  type: 'If';
  branches: IfBranchNode[];
}

export interface IfBranchNode {
  condition: string | null; // null = else
  children: TemplateNode[];
  loc: SourceLocation;
}

export interface ForNode extends BaseNode {
  type: 'For';
  source: string; // e.g. "item in items"
  value: string;  // e.g. "item"
  key: string | null; // e.g. "item.id"
  children: TemplateNode[];
  indexAlias: string | null;
  /**
   * `v-for` 指令自身的位置。
   *
   * ForNode.loc 是**宿主元素**的位置（与 If 一致），拿它无法反推指令写在哪，
   * 工具链（ESLint / DevTools / source map）要精确定位模板变量就必须有它。
   */
  directiveLoc: SourceLocation;
  /** `:key` 指令自身的位置；未写 key 时为 null */
  keyLoc: SourceLocation | null;
}

export interface PropNode extends BaseNode {
  type: 'Prop';
  name: string;
  value: PropValue | null; // null = boolean shorthand
  isDynamic: boolean; // v-bind or :
  isEvent: boolean; // @click or v-on
  isDirective: boolean; // v-if, v-for, v-slot 等指令
  eventModifiers: string[]; // .stop .prevent .once etc
}

export type PropValue = 
  | { type: 'Literal'; value: string | number | boolean }
  | { type: 'Expression'; value: string }
  | { type: 'Dynamic'; value: string };

// ============================================================================
// 编译时 Flags 分析
// ============================================================================

export interface CompileTimeFlags {
  flags: number; // VNodeFlags 位掩码
  dynamicProps: string[]; // 动态属性名列表
  hasEvent: boolean;
  hasSlot: boolean;
  staticKeys: Set<string>; // 编译时确定的 key
  dynamicSlots: string[]; // 动态插槽名
}

export interface CompileContext {
  filename: string;
  source: string;
  flags: CompileTimeFlags;
  imports: ImportSpec[];
  scope: ScopeContext;
  errors: CompileError[];
  warnings: CompileWarning[];
}

export interface ImportSpec {
  type: 'component' | 'directive' | 'helper';
  name: string;
  from: string;
  as?: string;
}

export interface ScopeContext {
  variables: Map<string, VariableInfo>;
  parent: ScopeContext | null;
  level: number;
}

export interface VariableInfo {
  name: string;
  type: 'ref' | 'computed' | 'prop' | 'local' | 'const';
  isReactive: boolean;
  declaredAt: Position;
}

export interface CompileError {
  message: string;
  loc: SourceLocation;
  code: string;
}

export interface CompileWarning {
  message: string;
  loc: SourceLocation;
  code: string;
}

// ============================================================================
// 解析器主入口
// ============================================================================

/**
 * 编译期指令名集合：这些不是真实 DOM 属性，构造宿主元素节点时必须剥离，
 * 否则会被当成 `if="count>2"` 这样的原生属性渲染到 DOM 上。
 *
 * 注意 `else` / `else-if` **故意不在此集合内**：它们必须活到
 * `attachElseBranch()` 才能把元素挂到前一个 `v-if` 上。若在这里剥离，
 * attachElseBranch 就再也认不出 v-else，分支会被当成普通元素无条件渲染
 * （此前正是这个顺序错误使 `v-else-if` / `v-else` 全部失效）。
 * 挂载成功后由 attachElseBranch 负责剔除这两个 prop。
 */
export const DIRECTIVE_PROP_NAMES = new Set([
  'if', 'v-if', 'for', 'v-for', 'key', 'slot', 'v-slot',
]);

/**
 * 取指令/动态属性的「表达式文本」。
 *
 * 注意：parser 把所有动态属性值统一标为 `{type:'Literal'}`（值即表达式原文），
 * 因此这里不能按 value.type 分支，直接取字符串即可。
 */
function propCondition(prop: PropNode): string {
  if (!prop.value) return 'true';
  return prop.value.type === 'Expression' ? prop.value.value : String(prop.value.value ?? 'true');
}

/** 解析 `item in items` / `(item, index) of items` 三种形态 */
function parseForExpression(expr: string): { value: string; source: string; indexAlias: string | null } {
  const m = expr.match(/^\s*\(?\s*([\w$]+)\s*(?:,\s*([\w$]+)\s*)?\)?\s+(?:in|of)\s+([\s\S]+?)\s*$/);
  if (!m) return { value: 'item', source: expr, indexAlias: null };
  return { value: m[1]!, indexAlias: m[2] ?? null, source: m[3]! };
}

/**
 * 取「指令宿主元素」：真正承载 `v-else` / `v-for` 等指令的那个元素节点。
 *
 * - `Element` / `Component` → 自身
 * - `For` → 循环体唯一子节点（wrapControlFlow 保证）
 *
 * 返回 null 表示该节点不可能承载 `v-else`（如 If / Text / Interpolation）。
 */
function hostElementOf(node: TemplateNode): ElementNode | ComponentNode | null {
  if (node.type === 'Element' || node.type === 'Component') return node;
  if (node.type === 'For') {
    const inner = node.children[0];
    if (inner && (inner.type === 'Element' || inner.type === 'Component')) return inner;
  }
  return null;
}

export interface ParseOptions {
  filename?: string;
  sourceMap?: boolean;
  preserveWhitespace?: boolean;
  delimiters?: [string, string];
  comments?: boolean;
}

export interface ParseResult {
  ast: TemplateAST;
  context: CompileContext;
}

export function parse(template: string, options: ParseOptions = {}): ParseResult {
  const context = createCompileContext(template, options);
  const ast = parseTemplate(template, context);
  return { ast, context };
}

export function createCompileContext(source: string, options: ParseOptions): CompileContext {
  return {
    filename: options.filename || 'anonymous.uf',
    source,
    flags: {
      flags: 0,
      dynamicProps: [],
      hasEvent: false,
      hasSlot: false,
      staticKeys: new Set(),
      dynamicSlots: [],
    },
    imports: [],
    scope: {
      variables: new Map(),
      parent: null,
      level: 0,
    },
    errors: [],
    warnings: [],
  };
}

export function analyzeTemplate(source: string, options: ParseOptions = {}): TemplateAST {
  const context = createCompileContext(source, options);
  return parseTemplate(source, context);
}

function parseTemplate(source: string, context: CompileContext): TemplateAST {
  const parser = new TemplateParser(source, context);
  const ast = parser.parse();
  parser.analyze(ast);
  return ast;
}

class TemplateParser {
  private source: string;
  private context: CompileContext;
  private pos: number = 0;
  private line: number = 1;
  private column: number = 1;
  private ast: TemplateAST | null = null;

  constructor(source: string, context: CompileContext) {
    this.source = source;
    this.context = context;
  }

  parse(): TemplateAST {
    const children = this.parseChildren();
    const ast: TemplateAST = {
      type: 'Template',
      children,
      source: this.source,
    };
    this.ast = ast;
    return ast;
  }

  private parseChildren(): TemplateNode[] {
    const nodes: TemplateNode[] = [];
    while (!this.isEnd()) {
      // 闭合标签不在此层消费，交还给外层 parseElementImpl 的 expect('</')
      // （否则闭合标签被吞后外层 expect 失败；此前该路径还会导致死循环）
      if (this.startsWith('</')) break;
      if (this.startsWith('{{')) {
        nodes.push(this.parseInterpolation());
      } else if (this.startsWith('<!--')) {
        nodes.push(this.parseComment());
      } else if (this.startsWith('<')) {
        const node = this.parseElement();
        // v-else / v-else-if 必须挂到前一个 v-if 节点上，否则会被当成
        // 独立元素渲染（此前缺失该逻辑，v-else 分支无法被编译期裁剪）
        if (node && !this.attachElseBranch(nodes, node)) {
          nodes.push(node);
        }
      } else {
        nodes.push(this.parseText());
      }
    }
    return nodes;
  }

  /**
   * 将 v-else / v-else-if 元素挂到紧邻的前一个 If 节点上。
   * 返回 true 表示已挂载（调用方不应再 push 为独立节点）。
   */
  private attachElseBranch(nodes: TemplateNode[], node: TemplateNode): boolean {
    // 宿主元素既可能是原生元素（<p v-else>）也可能是组件（<Child v-else>）；
    // 当 `v-else` 与 `v-for` 共存时节点已被 wrapControlFlow 包成 For，
    // `else` / `else-if` 指令则留在 For 的宿主元素上（见 hostElementOf）
    const host = hostElementOf(node);
    if (!host) return false;

    const idx = host.props.findIndex((p) => p.name === 'else' || p.name === 'else-if');
    if (idx < 0) return false;

    const prop = host.props[idx]!;
    let condition: string | null = null;
    if (prop.name === 'else-if' && prop.value) {
      condition = prop.value.type === 'Expression' ? prop.value.value : String(prop.value.value);
    }

    // 向前查找紧邻的 v-if 节点：允许中间存在纯空白文本（模板缩进/换行），
    // 但不允许夹杂其他元素或注释（与 Vue 的配对规则一致）
    let ifIndex = -1;
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i]!;
      if (n.type === 'Text' && n.content.trim() === '') continue; // 跳过空白
      ifIndex = n.type === 'If' ? i : -1;
      break;
    }
    if (ifIndex < 0) return false; // 孤立的 v-else：保持为普通元素

    const prev = nodes[ifIndex] as Extract<TemplateNode, { type: 'If' }>;

    // 从宿主元素上摘掉 else / else-if。For 节点必须连同宿主一起替换，
    // 否则循环体的宿主仍带着 else 指令（会渲染成 `else` 属性并触发告警）
    const cleaned = { ...host, props: host.props.filter((_, i) => i !== idx) };
    let branchBody: TemplateNode = cleaned;
    if (node.type === 'For') {
      branchBody = { ...(node as ForNode), children: [cleaned] };
    }

    const branch: IfBranchNode = {
      condition,
      children: [branchBody],
      loc: node.loc,
    };

    // 若尾部存在 parser 预置的空 else 占位分支，替换它而不是追加
    const last = prev.branches[prev.branches.length - 1];
    if (last && last.condition === null && last.children.length === 0) {
      prev.branches[prev.branches.length - 1] = branch;
    } else {
      prev.branches.push(branch);
    }

    return true;
  }

private parseElement(): TemplateNode | null {
    return this.parseElementImpl();
  }
  
  private parseElementImpl(): TemplateNode | null {
    const start = this.getPosition();
    this.expect('<');
    
    // 处理闭合标签：'<'> 已被 expect 消费，此处只需检查 '/'
    // （原写法 startsWith('</') 在消费 '<' 后永远为 false，是死循环根源之一）
    if (this.current() === '/') {
      this.skipTag();
      return null;
    }
    
    const tag = this.parseTagName();
    // 组件判定：大写开头（<MyComponent>）或含连字符（<my-component>，与 Vue 一致）
    const isComponent =
      tag.length > 1 &&
      (tag[0] !== undefined && tag[0] === tag[0].toUpperCase() || tag.includes('-'));
    
    const props = this.parseProps();
    
    // 检查自闭合
    const isSelfClosing = this.startsWith('/>');
    if (isSelfClosing) {
      this.expect('/>');
      const end = this.getPosition();

      // v-if / v-for 转换：**宿主元素必须保留**（作为分支/循环体的唯一子节点）。
      // 旧实现直接返回 If/For 并把 children 设为元素自身的 children，
      // 导致 `<li v-for="t in items">` 的 li 标签、class、:key 全部丢失，
      // `<p v-if="x">` 的 p 标签同样丢失 —— 见 parser 契约测试。
      const hostElement = this.buildHostElement(tag, props, [], true, isComponent, start, end);
      return this.wrapControlFlow(hostElement, props);
    }
    
    this.expect('>');
    
    // 解析子节点
    const children = this.parseChildren();
    
    // 解析闭合标签
    this.expect('</');
    this.expect(tag);
    this.skipWhitespace();
    this.expect('>');
    
    const end = this.getPosition();
    const hostElement = this.buildHostElement(tag, props, children, false, isComponent, start, end);
    return this.wrapControlFlow(hostElement, props);
  }

  /**
   * 把同一个元素上的 `v-for` / `v-if` 包装成 For / If 节点。
   *
   * 嵌套顺序固定为 **`v-if` 在外、`v-for` 在内**：`v-if` 的条件属于元素自身作用域，
   * 看不到 `v-for` 的迭代变量，因此 `<li v-if="show" v-for="t in items">`
   * 的语义是「show 为真时渲染整个列表」。
   *
   * 旧实现先查 `v-if` 并直接 return，`v-for` / `:key` 已在 buildHostElement 中
   * 被剥离且无人接手 —— 列表静默退化为单次渲染，模板里的 `t` 变成未定义引用
   * （产物 `_ctx.show ? h("li", null, [_ctx.t.name]) : null`，无任何报错）。
   * 见 parser 契约测试「v-if 与 v-for 共存」。
   */
  private wrapControlFlow(hostElement: TemplateNode, props: PropNode[]): TemplateNode {
    const forProp = props.find(p => p.name === 'for' || p.name === 'v-for');
    let node: TemplateNode = hostElement;

    if (forProp) {
      const parsed = parseForExpression(propCondition(forProp));
      const keyProp = props.find(p => p.name === 'key');
      node = {
        type: 'For',
        source: parsed.source,
        value: parsed.value,
        key: keyProp ? propCondition(keyProp) : null,
        children: [hostElement],
        indexAlias: parsed.indexAlias,
        loc: hostElement.loc,
        directiveLoc: forProp.loc,
        keyLoc: keyProp ? keyProp.loc : null,
      } as ForNode;
    }

    const ifProp = props.find(p => p.name === 'if' || p.name === 'v-if');
    if (ifProp) {
      return {
        type: 'If',
        branches: [
          { condition: propCondition(ifProp), children: [node], loc: ifProp.loc },
          { condition: null, children: [], loc: ifProp.loc },
        ],
        loc: hostElement.loc,
      } as IfNode;
    }

    return node;
  }

  /**
   * 构造宿主元素节点：剥离 v-if / v-for / :key / v-slot 等「编译期指令」，
   * 只保留真正的元素属性。If 分支与 For 循环体都以该节点作为唯一子节点。
   */
  private buildHostElement(
    tag: string,
    props: PropNode[],
    children: TemplateNode[],
    isSelfClosing: boolean,
    isComponent: boolean,
    start: Position,
    end: Position
  ): TemplateNode {
    return {
      type: isComponent ? 'Component' : 'Element',
      name: isComponent ? tag : undefined,
      tag: isComponent ? undefined : tag,
      props: props.filter(p => !DIRECTIVE_PROP_NAMES.has(p.name)),
      children,
      isSelfClosing,
      isComponent,
      componentName: isComponent ? tag : undefined,
      loc: this.makeLoc(start, end),
    } as TemplateNode;
  }

  private parseProps(): PropNode[] {
    const props: PropNode[] = [];
    while (!this.isEnd() && !this.startsWith('>') && !this.startsWith('/>')) {
      this.skipWhitespace();
      if (this.isEnd() || this.startsWith('>') || this.startsWith('/>')) break;
      
      const start = this.getPosition();
      const raw = this.parseAttributeName();
      
      // 防御：属性名解析不出且未推进 → 死循环风险，强制跳过当前字符
      if (raw === '' && this.getPosition().offset === start.offset) {
        this.advance();
        continue;
      }
      
      // 归一化：@click / :class / v-on:submit.prevent / v-bind:id / v-if
      // name 统一为裸名（click / class / submit / id / if），
      // 事件名与修饰符拆分（submit.prevent → name=submit, modifiers=[prevent]）
      let isDynamic = false;
      let isEvent = false;
      let name = raw;
      const eventModifiers: string[] = [];
      
      if (raw.startsWith('@')) {
        isEvent = true;
        isDynamic = true;
        name = raw.slice(1);
      } else if (raw.startsWith('v-on:')) {
        isEvent = true;
        isDynamic = true;
        name = raw.slice(5);
      } else if (raw.startsWith(':')) {
        isDynamic = true;
        name = raw.slice(1);
      } else if (raw.startsWith('v-bind:')) {
        isDynamic = true;
        name = raw.slice(7);
      } else if (raw.startsWith('v-')) {
        isDynamic = true;
        name = raw.slice(2);
      }
      
      if (isEvent && name.includes('.')) {
        const parts = name.split('.');
        name = parts[0] ?? name;
        eventModifiers.push(...parts.slice(1));
      }
      
      let value: PropValue | null = null;
      
      this.skipWhitespace();
      if (this.startsWith('=')) {
        this.expect('=');
        this.skipWhitespace();
        value = this.parseAttributeValue();
      }
      // 布尔简写：value 保持 null（PropNode 契约：null = boolean shorthand）
      
      props.push({
        type: 'Prop',
        name,
        value,
        isDynamic,
        isEvent,
        isDirective: raw.startsWith('v-') && !raw.startsWith('v-on:'),
        eventModifiers,
        loc: this.makeLoc(start, this.getPosition()),
      });
    }
    return props;
  }

  private parseAttributeValue(): PropValue {
    this.skipWhitespace();
    const quote = this.current();
    if (quote === '"' || quote === "'") {
      this.advance();
      let value = '';
      while (!this.isEnd() && this.current() !== quote) {
        value += this.current();
        this.advance();
      }
      this.expect(quote);
      return { type: 'Literal', value };
    }
    
    // 表达式
    let value = '';
    while (!this.isEnd() && !this.current().match(/[\s>]/)) {
      value += this.current();
      this.advance();
    }
    return { type: 'Expression', value: value.trim() };
  }
  
  private parseText(): TextNode {
    const start = this.getPosition();
    let content = '';
    while (!this.isEnd() && !this.startsWith('<') && !this.startsWith('{{')) {
      content += this.current();
      this.advance();
    }
    // 空白压缩规则（与 HTML / Vue 的 condense 一致）：
    //   - 纯空白且含换行（模板缩进）→ 丢弃
    //   - 其余把连续空白折叠为单个空格，但**保留首尾空格**
    // 此前一律 `content.trim()`，导致 `共 {{ n }} 项` 被渲染成 `共2项` ——
    // 文本与插值之间的空格是有意义的内容，不能当格式空白丢掉。
    const condensed = content.replace(/\s+/g, ' ');
    const isIndent = condensed.trim() === '' && content.includes('\n');
    return {
      type: 'Text',
      content: isIndent ? '' : condensed,
      loc: this.makeLoc(start, this.getPosition()),
    };
  }

  private parseInterpolation(): InterpolationNode {
    const start = this.getPosition();
    this.expect('{{');
    this.skipWhitespace();
    let expression = '';
    while (!this.isEnd() && !this.startsWith('}}')) {
      expression += this.current();
      this.advance();
    }
    this.expect('}}');
    return {
      type: 'Interpolation',
      expression: expression.trim(),
      loc: this.makeLoc(start, this.getPosition()),
    };
  }

  private parseComment(): CommentNode {
    const start = this.getPosition();
    this.expect('<!--');
    let content = '';
    while (!this.isEnd() && !this.startsWith('-->')) {
      content += this.current();
      this.advance();
    }
    this.expect('-->');
    return {
      type: 'Comment',
      // 注释内容保留原样（含首尾空格）—— 与 Vue 行为一致
      content,
      loc: this.makeLoc(start, this.getPosition()),
    };
  }

  private parseTagName(): string {
    this.skipWhitespace();
    let name = '';
    while (!this.isEnd() && this.current().match(/[a-zA-Z0-9-_:]/)) {
      name += this.current();
      this.advance();
    }
    return name;
  }

  private parseAttributeName(): string {
    this.skipWhitespace();
    let name = '';
    // '@' 必须在字符集内：事件指令 @click 的 '@' 若不消费，
    // 本方法返回空串且 pos 不推进，parseProps 的 while 会死循环
    while (!this.isEnd() && this.current().match(/[a-zA-Z0-9-_:.@]/)) {
      name += this.current();
      this.advance();
    }
    return name;
  }

  private getPosition(): Position {
    return { offset: this.pos, line: this.line, column: this.column };
  }

  private makeLoc(start: Position, end: Position): SourceLocation {
    return { start, end, source: this.source.slice(start.offset, this.pos) };
  }

  private current(): string {
    return this.source[this.pos] || '';
  }

  private advance(): void {
    const char = this.source[this.pos];
    if (char === '\n') {
      this.line++;
      this.column = 1;
    } else {
      this.column++;
    }
    this.pos++;
  }

  private isEnd(): boolean {
    return this.pos >= this.source.length;
  }

  private startsWith(str: string): boolean {
    return this.source.slice(this.pos, this.pos + str.length) === str;
  }

  private expect(str: string): void {
    if (!this.startsWith(str)) {
      throw new Error(`Expected "${str}" at position ${this.pos}`);
    }
    this.pos += str.length;
  }

  private skipWhitespace(): void {
    while (!this.isEnd() && this.current().match(/\s/)) {
      this.advance();
    }
  }

  private skipTag(): void {
    while (!this.isEnd() && this.current() !== '>') {
      this.advance();
    }
    if (this.current() === '>') this.advance();
  }
  
  // ============================================================================
  // 编译时 Flags 分析
  // ============================================================================
  
  analyze(ast: TemplateAST): CompileTimeFlags {
    this.analyzeChildren(ast.children);
    this.mergeFlags();
    return this.context.flags;
  }
  
  private analyzeChildren(nodes: TemplateNode[]): void {
    for (const node of nodes) {
      this.analyzeNode(node);
    }
  }
  
  private analyzeNode(node: TemplateNode): void {
    switch (node.type) {
      case 'Element':
        this.analyzeElement(node);
        break;
      case 'Component':
        this.analyzeComponent(node);
        break;
      case 'Slot':
        this.analyzeSlot(node);
        break;
      case 'If':
        this.analyzeIf(node);
        break;
      case 'For':
        this.analyzeFor(node);
        break;
      case 'Interpolation':
        this.analyzeInterpolation(node);
        break;
      case 'Text':
      case 'Comment':
        break;
    }
  }
  
  private analyzeElement(node: ElementNode): void {
    // 分析 props
    for (const prop of node.props) {
      if (prop.isDynamic) {
        this.context.flags.dynamicProps.push(prop.name);
      }
      if (prop.isEvent) {
        this.context.flags.hasEvent = true;
      }
    }
    this.analyzeChildren(node.children);
  }
  
  private analyzeComponent(node: ComponentNode): void {
    this.context.flags.hasSlot = true;
    this.analyzeChildren(node.children);
  }
  
  private analyzeSlot(node: SlotNode): void {
    this.context.flags.hasSlot = true;
    this.context.flags.dynamicSlots.push(node.name || 'default');
    this.analyzeChildren(node.fallback);
  }
  
  private analyzeIf(node: IfNode): void {
    for (const branch of node.branches) {
      this.analyzeChildren(branch.children);
    }
  }
  
  private analyzeFor(node: ForNode): void {
    this.context.flags.flags |= 16; // VNodeFlags.MULTI_DYNAMIC
    this.analyzeChildren(node.children);
  }
  
  private analyzeInterpolation(node: InterpolationNode): void {
    this.context.flags.dynamicProps.push(node.expression);
  }
  
  private mergeFlags(): void {
    if (this.context.flags.dynamicProps.length > 1) {
      this.context.flags.flags |= 16; // MULTI_DYNAMIC
    }
  }
}