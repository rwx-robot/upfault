/**
 * UpFault SSR - Client Hydration
 * 
 * Client-side hydration for server-rendered HTML
 */

import { h, createRenderer, defaultRendererOptions, type VNode, type ComponentInstance } from '@upfault/runtime';
import { aeroDiff, DiffOpType } from '@upfault/diff';

export interface HydrationContext {
  container: HTMLElement;
  vnode: VNode;
  isHydrating: boolean;
  teleports: Map<string, HTMLElement>;
  pendingTeleports: Map<string, VNode[]>;
