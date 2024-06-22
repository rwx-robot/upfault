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

