/**
 * UpFault Runtime - VNode Creation (h function)
 * 
 * 虚拟节点创建工具，兼容 JSX transform
 * 参考 Vue 3 h() 设计
 */

import type {
  VNode,
  VNodeProps,
  PatchFlags,
  Component,
  ComponentInstance,
  Ref,
} from '@upfault/shared/diff';

import { VNodeType, PatchFlags as SharedPatchFlags } from '@upfault/shared/diff';

// Re-export from shared
export type { VNode, VNodeProps, Component, ComponentInstance, Ref } from '@upfault/shared/diff';
export { VNodeType } from '@upfault/shared/diff';

// ============================================================================
// 类型定义
// ============================================================================

/**
 * Props 标准化后的类型