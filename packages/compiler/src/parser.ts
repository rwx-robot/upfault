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