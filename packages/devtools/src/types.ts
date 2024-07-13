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
