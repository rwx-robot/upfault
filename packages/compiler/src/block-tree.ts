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