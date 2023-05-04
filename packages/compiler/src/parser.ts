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
      if (this.startsWith('{{')) {
        nodes.push(this.parseInterpolation());
      } else if (this.startsWith('<!--')) {
        nodes.push(this.parseComment());
      } else if (this.startsWith('<')) {
        const node = this.parseElement();
        if (node) nodes.push(node);
      } else {
        nodes.push(this.parseText());
      }
    }
    return nodes;
  }

private parseElement(): TemplateNode | null {
    return this.parseElementImpl();
  }
  
  private parseElementImpl(): TemplateNode | null {
    const start = this.getPosition();
    this.expect('<');
    
    // 处理闭合标签
    if (this.startsWith('</')) {
      this.skipTag();
      return null;
    }
    
    const tag = this.parseTagName();
    const isComponent = tag.length > 0 && tag[0] !== undefined && tag[0] === tag[0].toUpperCase() && tag.length > 1;
    
    const props = this.parseProps();
    
    // 检查自闭合
    const isSelfClosing = this.startsWith('/>');
    if (isSelfClosing) {
      this.expect('/>');
      const end = this.getPosition();
      
      // v-if 转换为 IfNode
      const ifProp = props.find(p => p.name === 'if' || p.name === 'v-if');
      if (ifProp) {
        return {
          type: 'If',
          branches: [
            { condition: ifProp.value?.type === 'Expression' ? ifProp.value.value : ifProp.value?.value?.toString() || 'true', children: [], loc: ifProp.loc },
            { condition: null, children: [], loc: ifProp.loc },
          ],
          loc: this.makeLoc(start, end),
        } as IfNode;
      }
      
      // v-for 转换为 ForNode
      const forProp = props.find(p => p.name === 'for' || p.name === 'v-for');
      if (forProp) {
const forValue = forProp.value?.type === 'Expression' ? forProp.value.value : forProp.value?.value?.toString() || '';
        const match = forValue.match(/^\s*(\w+)\s+(?:in|of)\s+(.+)\s*$/);
        const value = match ? match[1] : 'item';
        const source = match ? match[2] : forValue;
        const keyProp = props.find(p => p.name === 'key');
const key = keyProp && keyProp.value?.type === 'Expression' ? keyProp.value.value : keyProp?.value?.value?.toString() || null;
        
        return {
          type: 'For',
          source,
          value,
          key,
          children: [],
          indexAlias: null,
          loc: this.makeLoc(start, end),
        } as ForNode;
      }
      
      return {
        type: isComponent ? 'Component' : 'Element',
        name: isComponent ? tag : undefined,
        tag: isComponent ? undefined : tag,
        props: props.filter(p => !p.isDirective),
        children: [],
        isSelfClosing: true,
        isComponent,
        componentName: isComponent ? tag : undefined,
        loc: this.makeLoc(start, end),
      } as TemplateNode;
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
    
    // v-if 转换为 IfNode
    const ifProp = props.find(p => p.name === 'if' || p.name === 'v-if');
    if (ifProp) {
      return {
        type: 'If',
        branches: [
          { condition: ifProp.value?.type === 'Expression' ? ifProp.value.value : ifProp.value?.value?.toString() || 'true', children, loc: ifProp.loc },
          { condition: null, children: [], loc: ifProp.loc },
        ],
        loc: this.makeLoc(start, end),
      } as IfNode;
    }
    
    // v-for 转换为 ForNode
    const forProp = props.find(p => p.name === 'for' || p.name === 'v-for');
    if (forProp) {
      const forValue = forProp.value?.type === 'Expression' ? forProp.value.value : forProp.value?.value?.toString() || '';
      const match = forValue.match(/^\s*(\w+)\s+(?:in|of)\s+(.+)\s*$/);
      const value = match ? match[1] : 'item';
      const source = match ? match[2] : forValue;
      const keyProp = props.find(p => p.name === 'key');
      const key = keyProp && keyProp.value?.type === 'Expression' ? keyProp.value.value : keyProp?.value?.value?.toString() || null;
      
      return {
        type: 'For',
        source,
        value,
        key,
        children,
        indexAlias: null,
        loc: this.makeLoc(start, end),
      } as ForNode;
    }
    
    // 普通元素或组件
    return {
      type: isComponent ? 'Component' : 'Element',
      name: isComponent ? tag : undefined,
      tag: isComponent ? undefined : tag,
      props: props.filter(p => !p.isDirective),
      children,
      isSelfClosing: false,
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
      const name = this.parseAttributeName();
      
      // 指令
      const isDirective = name.startsWith('v-') || name.startsWith(':') || name.startsWith('@');
      let isDynamic = false;
      let isEvent = false;
      let isSlot = false;
      
      if (name.startsWith('@')) {
        isEvent = true;
        isDynamic = true;
      } else if (name.startsWith(':')) {
        isDynamic = true;
      } else if (name.startsWith('v-')) {
        isDynamic = true;
      } else if (name.startsWith('v-bind:') || name.startsWith(':')) {
        isDynamic = true;
      }
      
      let value: PropValue | null = null;
      
      this.skipWhitespace();
      if (this.startsWith('=')) {
        this.expect('=');
        this.skipWhitespace();
        value = this.parseAttributeValue();
      } else {
        // 布尔简写
        value = { type: 'Literal', value: true };
      }
      
      // 处理修饰符
      const eventModifiers: string[] = [];
      if (isEvent) {
        const parts = name.split('.');
        if (parts.length > 1) {
          eventModifiers.push(...parts.slice(1));
        }
      }
      
      props.push({
        type: 'Prop',
        name: name.replace(/^[@:]/, '').replace(/^v-/, ''),
        value,
        isDynamic,
        isEvent,
        isDirective,
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
    return {
      type: 'Text',
      content: content.trim(),
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
      content: content.trim(),
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
    while (!this.isEnd() && this.current().match(/[a-zA-Z0-9-_:.]/)) {
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