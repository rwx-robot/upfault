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
  createText: (text: string) => HostText;
  createComment: (text: string) => HostComment;
  setElementText: (el: HostElement, text: string) => void;
  setText: (node: HostText, text: string) => void;
  insert: (child: HostElement, parent: HostElement, anchor?: HostElement | null) => void;
  remove: (child: HostElement) => void;
  patchProp: (el: HostElement, key: string, prevValue: any, nextValue: any) => void;
  parentNode?: (node: HostElement) => HostElement | null;
  nextSibling?: (node: HostElement) => HostElement | null;
  addEventListener?: (el: HostElement, event: string, handler: EventListener) => void;
  removeEventListener?: (el: HostElement, event: string, handler: EventListener) => void;
  _nodeToElement?: (node: Node) => HostElement | null;
}

export function createRenderer<HostElement = Element>(
  options: RendererOptions<HostElement>
): { 
  render: (vnode: VNode | null, container: HostElement) => void;
  hydrate: (vnode: VNode, container: HostElement) => void;
  m: (vnode: VNode, parent: HostElement, anchor?: HostElement | null) => void;
  p: (n1: VNode | null, n2: VNode, parent: HostElement, anchor?: HostElement | null) => void;
  umount: (vnode: VNode, parent: HostElement | null) => void;
} {
  // Simplified implementation for SSR
  const { createElement, createText, createComment, setElementText, setText, insert, remove, patchProp, parentNode, nextSibling, _nodeToElement } = options;
  
  const containerVNodes = new WeakMap<HostElement, VNode | null>();
  
  function getContainerVNode(container: HostElement): VNode | null {
    return containerVNodes.get(container) ?? null;
  }
  
  function setContainerVNode(container: HostElement, vnode: VNode | null): void {
    containerVNodes.set(container, vnode);
  }

  function patch(n1: VNode | null, n2: VNode, parent: HostElement, anchor: HostElement | null = null): void {
    // Simplified
    if (!n1) {
      // Mount logic would go here
    }
  }

  function render(vnode: VNode | null, container: HostElement): void {
    if (vnode === null) {
      const prevVNode = getContainerVNode(container);
      if (prevVNode) {
        // unmount logic
        setContainerVNode(container, null);
      }
      return;
    }
    // render logic
  }

  function hydrate(vnode: VNode, container: HostElement): void {
    render(vnode, container);
  }

  return { render, hydrate, m: () => {}, p: patch, umount: () => {} };
}

export const defaultRendererOptions: RendererOptions = {
  createElement: (tag: string, isSVG?: boolean) => {
    return isSVG 
      ? document.createElementNS('http://www.w3.org/2000/svg', tag)
      : document.createElement(tag);
  },
  createText: (text: string) => document.createTextNode(text),
  createComment: (text: string) => document.createComment(text),
  setElementText: (el: Element, text: string) => { el.textContent = text; },
  setText: (node: Text, text: string) => { node.nodeValue = text; },
  insert: (child: Node, parent: Element, anchor?: Element | null) => { parent.insertBefore(child, anchor || null); },
  remove: (child: Node) => { child.parentNode?.removeChild(child); },
  patchProp: (el: Element, key: string, prevValue: any, nextValue: any) => {
    if (key.startsWith('on')) {
      const event = key.slice(2).toLowerCase();
      if (prevValue) el.removeEventListener(event, prevValue);
      if (nextValue) el.addEventListener(event, nextValue);
    } else if (key === 'class') {
      el.className = nextValue || '';
    } else if (key === 'style') {
      const style = (el as HTMLElement).style;
      if (typeof nextValue === 'string') style.cssText = nextValue;
      else if (nextValue && typeof nextValue === 'object') Object.assign(style, nextValue);
      else style.cssText = '';
    } else if (key in el) {
      (el as any)[key] = nextValue;
    } else if (nextValue == null || nextValue === false) {