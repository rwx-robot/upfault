import type { VNode } from './h';
import type { ComponentInstance } from '@upfault/shared/diff';
import { VNodeType } from '@upfault/shared/diff';
import { aeroDiff, DiffOpType, type DiffOp, type DiffResult, type Block } from '@upfault/diff';
import { PatchFlags, type VNode as SharedVNode, type ComponentInstance as SharedComponentInstance, type Component } from '@upfault/shared';
import { callBeforeMount, callMounted, callBeforeUpdate, callUpdated, callBeforeUnmount, callUnmounted, callActivated, callDeactivated, handleError, pushInstance, popInstance, getCurrentInstance, setCurrentInstance, instanceStack } from './lifecycle';

// VNode 形状标记
const VNodeShapeFlags = {
  ELEMENT: 1,
  COMPONENT: 1 << 1,
  TEXT_NODE: 1 << 2,
  FRAGMENT: 1 << 3,
  TELEPORT: 1 << 4,
  SUSPENSE: 1 << 5,
  ARRAY_CHILDREN: 1 << 6,
} as const;

export interface RendererOptions<
  HostElement = Element,
  HostText = Text,
  HostComment = Comment
> {
  createElement: (tag: string, isSVG?: boolean) => HostElement;
