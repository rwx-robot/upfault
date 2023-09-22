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
  parentNode: (node: HostElement) => HostElement | null;
  nextSibling: (node: HostElement) => HostElement | null;
  
  // 额外类型转换辅助
  _nodeToElement?: (node: Node) => HostElement | null;
  
  // 可选：自定义事件处理
  addEventListener?: (el: HostElement, event: string, handler: EventListener) => void;
  removeEventListener?: (el: HostElement, event: string, handler: EventListener) => void;
}

// ============================================================================
// 内部类型
// ============================================================================

interface RendererInternals<HostElement> {
  p: (n1: VNode | null, n2: VNode, parent: HostElement, anchor?: HostElement | null) => void;
  umount: (vnode: VNode, parent: HostElement | null) => void;
  m: (vnode: VNode, parent: HostElement, anchor?: HostElement | null) => void;
}

interface RendererWithHydrate<HostElement> extends RendererInternals<HostElement> {
  render: (vnode: VNode | null, container: HostElement) => void;
  hydrate: (vnode: VNode, container: HostElement) => void;
}

// ============================================================================
// 创建渲染器主函数
// ============================================================================

export function createRenderer<HostElement = Element>(
  options: RendererOptions<HostElement>
): RendererWithHydrate<HostElement> {
  const {
    createElement,
    createText,
    createComment,
    setElementText,
    setText,
    insert,
    remove,
    patchProp,
    parentNode,
    nextSibling,
  } = options;
  
  // 使用 WeakMap 存储容器的根 VNode
  const containerVNodes = new WeakMap<HostElement, VNode | null>();
  
  function getContainerVNode(container: HostElement): VNode | null {
    return containerVNodes.get(container) ?? null;
  }
  
  function setContainerVNode(container: HostElement, vnode: VNode | null): void {
    containerVNodes.set(container, vnode);
  }
  
  // Node to HostElement 转换
  const toElement = options._nodeToElement || ((node: Node) => node as HostElement | null);

  // ========================================================================
  // 挂载
  // ========================================================================
  
  function mountElement(
    vnode: VNode,
    parent: HostElement,
    anchor: HostElement | null = null
  ): void {
    const { type, props, children, shapeFlag, patchFlag, ref } = vnode;
    
    // 创建 DOM 元素
    const isSVG = type === 'svg' || (vnode as any).isSVG;
    const el = createElement(type as string, isSVG);
        
    // 关联 VNode 与 DOM
    vnode.el = el;
        
    // 挂载 props
    if (props) {
      for (const key in props) {
        if (key !== 'children' && key !== 'key' && key !== 'ref') {
          patchProp(el, key, null, props[key]);
        }
      }
     
    // 挂载 children
    if (shapeFlag & VNodeShapeFlags.TEXT_NODE) {
      // 文本节点
            setElementText(el, children as string);
          } else if (shapeFlag & VNodeShapeFlags.ARRAY_CHILDREN) {
      // 数组子节点
      mountChildren(children as VNode[], el, null);
    } else if (shapeFlag & VNodeShapeFlags.COMPONENT) {
      // 组件 - 由 mountComponent 处理
    }
    
    // 插入 DOM
    insert(el, parent, anchor);
        
    // 处理 ref
    if (ref) {
      setRef(ref, el);
    }
  }
  
  function mountChildren(
    children: VNode[],
    parent: HostElement,
    anchor: HostElement | null
  ): void {
    for (const child of children) {
      if (child == null) continue;
      patch(null, child, parent, anchor);
    }
  }
  
  function mountText(vnode: VNode, parent: HostElement, anchor: HostElement | null = null): void {
    const el = createText(vnode.children as string);
    vnode.el = el;
    insert(el, parent, anchor);
  }
  
  function mountComment(vnode: VNode, parent: HostElement, anchor: HostElement | null = null): void {
    const el = createComment(vnode.children as string || '');
    vnode.el = el;
    insert(el, parent, anchor);
  }
  
  function mountFragment(
    vnode: VNode,
    parent: HostElement,
    anchor: HostElement | null
  ): void {
    mountChildren(vnode.children as VNode[], parent, anchor);
  }
  
  function mountComponent(
    vnode: VNode,
    parent: HostElement,
    anchor: HostElement | null
  ): void {
    const { type, props, children, componentInstance } = vnode;
    const component = type as Component;
    
    // 创建组件实例
    const instance: ComponentInstance = {
      uid: instanceStack.length + 1,
      type: component,