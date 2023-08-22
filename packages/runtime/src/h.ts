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
 */
export interface NormalizedProps extends Record<string, any> {
  key?: string | number | null;
  ref?: Ref<any> | ((value: any) => void);
  class?: string | Record<string, boolean> | string[];
  style?: string | Record<string, string | number>;
  onClick?: (e: Event) => void;
  onInput?: (e: Event) => void;
  onChange?: (e: Event) => void;
  onSubmit?: (e: Event) => void;
  [key: `on${string}`]: ((e: Event) => void) | undefined;
  [key: string]: any;
}

/**
 * VNode 子节点类型
 */
export type VNodeChild = 
  | VNode 
  | string 
  | number 
  | boolean 
  | null 
  | undefined 
  | VNodeChild[];

/**
 * 组件类型
 */
export type ComponentType = 
  | string 
  | Component 
  | ComponentInstance 
  | (new () => ComponentInstance);

/**
 * h() 函数重载签名
 */
export interface HFunction {
  // Element
  (type: string, props?: NormalizedProps | null, ...children: VNodeChild[]): VNode;
  (type: string, ...children: VNodeChild[]): VNode;
  