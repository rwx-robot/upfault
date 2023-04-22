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
