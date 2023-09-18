/**
 * UpFault Runtime - DOM Renderer
 * 
 * 虚拟 DOM 到真实 DOM 的挂载、更新、卸载
 * 参考 Vue 3 renderer 设计
 */

import { 
  h, 
  Fragment, 
  Text, 
  Comment,
  type VNode,
  type VNodeProps,
  type NormalizedProps,
} from './h';

import { 
  aeroDiff, 
  DiffOpType, 
  type DiffOp, 
  type DiffResult,
  type Block 
} from '@upfault/diff';

import { 
  PatchFlags,
  type VNode as SharedVNode,
  type ComponentInstance,
  type Component,
} from '@upfault/shared';

// VNodeType constants (inline to avoid import issues)
const VNodeType = {
  TEXT: 1,
  ELEMENT: 2,
  COMPONENT: 3,
  BLOCK: 4,
  FRAGMENT: 5,
  COMMENT: 6,
  TELEPORT: 7,
  SUSPENSE: 8,
  KEEPALIVE: 9,
};

import type { RendererOptions } from './renderer-options';

import { 
  callBeforeMount, 
  callMounted, 
  callBeforeUpdate, 
  callUpdated,
  callBeforeUnmount,
  callUnmounted,
  callActivated,
  callDeactivated,
  handleError,
  pushInstance,
  popInstance,
  getCurrentInstance,
  setCurrentInstance,
  instanceStack,
} from './lifecycle';

// ============================================================================
// VNode 形状标记 (运行时用，与 h.ts 保持一致)
// ============================================================================

const VNodeShapeFlags = {
  ELEMENT: 1,
  COMPONENT: 1 << 1,
  TEXT_NODE: 1 << 2,
  FRAGMENT: 1 << 3,
  TELEPORT: 1 << 4,
  SUSPENSE: 1 << 5,
  ARRAY_CHILDREN: 1 << 6,
} as const;

// ============================================================================
// 渲染器选项接口
// ============================================================================

export interface RendererOptions<
  HostElement = Element,
  HostText = Text,
  HostComment = Comment
> {
  // DOM 操作
  createElement: (tag: string, isSVG?: boolean) => HostElement;
  createText: (text: string) => HostText;
  createComment: (text: string) => HostComment;
  
  setElementText: (el: HostElement, text: string) => void;
  setText: (node: HostText, text: string) => void;
  
  insert: (child: Node, parent: HostElement, anchor?: HostElement | null) => void;
  remove: (child: Node) => void;
  
  patchProp: (el: HostElement, key: string, prevValue: any, nextValue: any) => void;
  
  // 生命周期