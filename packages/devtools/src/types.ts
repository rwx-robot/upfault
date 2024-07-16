/**
 * UpFault DevTools 类型定义 (内部定义，避免依赖 workspace 包类型问题)
 */

// 组件实例接口 (简化版，避免依赖 @upfault/runtime)
export interface ComponentInstance {
  uid: number;
  type: any;
  vnode: any;
  parent: ComponentInstance | null;
  root: ComponentInstance | null;
  proxy: any;
  provides: Record<string, any>;
  inject: Record<string, any>;
  props: Record<string, any>;
  isMounted: boolean;
  isUnmounted: boolean;
  isDeactivated: boolean;
  render: (() => any) | null;
  update: (() => void) | null;
  effects: any[];
  onBeforeMount: (() => void)[];
  onMounted: (() => void)[];
  onBeforeUpdate: (() => void)[];
  onUpdated: (() => void)[];
  onBeforeUnmount: (() => void)[];
  onUnmounted: (() => void)[];
  onActivated: (() => void)[];
  onDeactivated: (() => void)[];
  onErrorCaptured: any[];
  onRenderTracked: any[];
  onRenderTriggered: any[];
  subTree: any;
  subTreeAnchor: any;
  children?: ComponentInstance[];
}

// VNode 类型 (简化版)
export interface VNode {
  type: any;
  key: string | number | null;
  props: Record<string, any> | null;
  children: any[] | string | null;
  el: Element | null;
  componentInstance: ComponentInstance | null;
  shapeFlag: number;
  patchFlag: number;
}

// Ref 类型 (简化版)
export interface Ref<T = any> {
  value: T;
  __v_isRef: true;
  __v_isReadonly?: boolean;
  __v_isShallow?: boolean;
}

// Ref 信息
export interface RefInfo {
  key: string;
  value: any;
  isReadonly: boolean;
  isShallow: boolean;
}

// Computed 信息