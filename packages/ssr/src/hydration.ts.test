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
}

export interface HydrationOptions {
  container: HTMLElement | string;
  vnode: VNode;
  onHydrated?: () => void;
  onError?: (error: Error) => void;
  removeContainer?: boolean;
}

export function hydrate(vnode: VNode, container: HTMLElement | string): ComponentInstance {
  const containerEl = typeof container === 'string' 
    ? (document.querySelector(container) as HTMLElement)! 
    : container;
  
  if (!containerEl) {
    throw new Error('Container not found: ' + container);
  }
  
  const renderer = createRenderer({
    ...defaultRendererOptions,