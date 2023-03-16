/**
 * UpFault Compiler - Block Tree
 * 
 * 编译时识别动态边界，生成最小化 Patch 树
 * 参考 Vue 3 Block Tree 设计，但简化为三档粒度
 */

import { VNodeFlags, VNodeType } from '@upfault/shared';
import type { TemplateAST, TemplateNode, ElementNode, ComponentNode, SlotNode, IfNode, ForNode, InterpolationNode, CommentNode, TextNode, CompileTimeFlags, CompileContext } from './parser';

// ============================================================================
// Block 类型定义
// ============================================================================

export const enum BlockGranularity {
  /** 粗粒度：整个组件为一个 Block */
  Coarse = 'coarse',
  /** 中粒度：按控制流结构分块 (if/for/组件) */
  Medium = 'medium',
  /** 细粒度：每个动态节点独立 Block */
  Fine = 'fine',
}

export interface Block {
  id: string;
  type: BlockType;
  granularity: BlockGranularity;
  root: BlockNode;
  dynamicNodes: BlockNode[]; // 编译时确定的动态节点
  priority: number; // 0-255
  parent: Block | null;
  children: Block[];
  // 编译时元数据
  compileFlags: number; // 聚合的 VNodeFlags
  staticKeys: Set<string>;
  dynamicProps: Set<string>;
  hasEvent: boolean;
  hasSlot: boolean;
}

export const enum BlockType {
  Root = 'root',           // 组件根 Block
  Element = 'element',     // 普通元素 Block
  Component = 'component', // 组件 Block
  Slot = 'slot',           // 插槽 Block
  If = 'if',               // v-if Block
  For = 'for',             // v-for Block
  Fragment = 'fragment',   // Fragment Block
}

export interface BlockNode {
  id: string;
  nodeType: VNodeType;
  tag: string;
  flags: number; // VNodeFlags
  props: PropMeta[];