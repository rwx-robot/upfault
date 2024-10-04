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
    patchProp: (el: HTMLElement, key: string, _: any, value: any) => {
      if (key.startsWith('on')) {
        const event = key.slice(2).toLowerCase();
        if (value) {
          el.addEventListener(event, value);
        }
      } else if (key === 'class') {
        el.className = value || '';
      } else if (key === 'style') {
        if (typeof value === 'string') {
          el.style.cssText = value;
        } else if (value && typeof value === 'object') {
          Object.assign(el.style, value);
        } else {
          el.style.cssText = '';
        }
      } else if (key in el) {
        (el as any)[key] = value;
      } else if (value == null || value === false) {
        el.removeAttribute(key);
      } else {
        el.setAttribute(key, value);
      }
    },
    insert: (child: Node, parent: HTMLElement, anchor?: Node | null) => {
      parent.insertBefore(child, anchor || null);
    },
    remove: (child: Node) => {
      child.parentNode?.removeChild(child);
    },
    parentNode: (node: Node) => node.parentNode as HTMLElement | null,
    nextSibling: (node: Node) => node.nextSibling as HTMLElement | null,
  });
  
  const instance = renderer.render(vnode, containerEl);
  return instance;
}

export function hydrateRoot(vnode: VNode, container: HTMLElement | string, options: {
  onHydrated?: () => void;
  onError?: (error: Error) => void;
} = {}): ComponentInstance {
  const containerEl = typeof container === 'string' 
    ? (document.querySelector(container) as HTMLElement)! 
    : container;
  
