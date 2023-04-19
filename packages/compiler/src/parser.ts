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
