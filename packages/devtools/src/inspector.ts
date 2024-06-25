/**
 * UpFault 组件检查器
 * 
 * 提供组件树遍历、属性检查、VNode 分析功能
 */

import type { 
  ComponentInstance, 
  VNode, 
  VNodeInfo, 
  ComponentInfo, 
  RefInfo, 
  ComputedInfo, 
  EffectInfo, 
  LifecycleInfo 
} from './types';

export type { 
  ComponentInstance, 
  VNode, 
  VNodeInfo, 
  ComponentInfo, 
  RefInfo, 
  ComputedInfo, 
  EffectInfo, 
  LifecycleInfo 
} from './types';

export interface Inspector {
  inspectComponent(instance: ComponentInstance): ComponentInfo;
  inspectVNode(vnode: VNode): VNodeInfo;
  getComponentTree(rootInstance: ComponentInstance): ComponentInfo;
  findComponentByName(rootInstance: ComponentInstance, name: string): ComponentInfo | null;
  findComponentByUid(rootInstance: ComponentInstance, uid: number): ComponentInfo | null;
  highlightComponent(element: Element): void;
  unhighlightComponent(): void;
}

/**
 * 创建检查器实例
 */
export function createInspector(): Inspector {
  let highlightOverlay: HTMLElement | null = null;
  
  return {
    inspectComponent,
    inspectVNode,
    getComponentTree,
    findComponentByName,
    findComponentByUid,
    highlightComponent,
    unhighlightComponent,
  };

  function inspectComponent(instance: ComponentInstance): ComponentInfo {
    return {
      uid: instance.uid,
      type: instance.type,
      name: getComponentName(instance.type),
      props: { ...instance.props },
      state: getReactiveState(instance),
      refs: inspectRefs(instance),
      computed: inspectComputed(instance),
      effects: inspectEffects(instance),
      lifecycle: inspectLifecycle(instance),
      parent: instance.parent ? inspectComponent(instance.parent) : undefined,
      children: instance.children?.map(inspectComponent) || [],
      vnode: inspectVNode(instance.vnode!),
      isMounted: instance.isMounted,
      isUnmounted: instance.isUnmounted,
    };
  }

  function inspectVNode(vnode: VNode): VNodeInfo {
    if (!vnode) return null as any;
    
    return {
      type: vnode.type,
      key: vnode.key,
      props: vnode.props ? { ...vnode.props } : null,
      children: Array.isArray(vnode.children) 
        ? vnode.children.map(inspectVNode)
        : typeof vnode.children === 'string' 
          ? vnode.children 
          : null,
      el: vnode.el,
      componentInstance: vnode.componentInstance,
      shapeFlag: vnode.shapeFlag,
      patchFlag: vnode.patchFlag,
    };
  }

  function getComponentTree(rootInstance: ComponentInstance): ComponentInfo {
    return inspectComponent(rootInstance);
  }

  function findComponentByName(rootInstance: ComponentInstance, name: string): ComponentInfo | null {
    const tree = inspectComponent(rootInstance);
    return findInTree(tree, c => c.name === name);
  }

  function findComponentByUid(rootInstance: ComponentInstance, uid: number): ComponentInfo | null {
    const tree = inspectComponent(rootInstance);
    return findInTree(tree, c => c.uid === uid);
  }

  function findInTree(tree: ComponentInfo, predicate: (c: ComponentInfo) => boolean): ComponentInfo | null {
    if (predicate(tree)) return tree;
    for (const child of tree.children) {
      const found = findInTree(child, predicate);
      if (found) return found;
    }
    return null;
  }

  function highlightComponent(element: Element): void {
    if (highlightOverlay) {
      unhighlightComponent();
    }
    
    const rect = element.getBoundingClientRect();
    highlightOverlay = document.createElement('div');
    highlightOverlay.style.cssText = `
      position: fixed;
      top: ${rect.top}px;
      left: ${rect.left}px;
      width: ${rect.width}px;
      height: ${rect.height}px;
      border: 2px solid #3b82f6;
      background: rgba(59, 130, 246, 0.1);
      pointer-events: none;
      z-index: 2147483647;
      box-sizing: border-box;
      transition: all 0.1s ease;
    `;
    highlightOverlay.setAttribute('data-upfault-highlight', 'true');
    document.body.appendChild(highlightOverlay);
  }

  function unhighlightComponent(): void {
    if (highlightOverlay) {
      highlightOverlay.remove();