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