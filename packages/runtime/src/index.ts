/**
 * @upfault/runtime - UpFault 运行时核心
 * 
 * 核心运行时：VNode 创建、组件系统、渲染器、生命周期
 * 版本: 0.2.0
 */

// VNode 创建 (h 函数)
export {
  h,
  Fragment,
  Text,
  Comment,
  jsx,
  jsxs,
  jsxDEV,
  FragmentSymbol,
} from './h';

export type {
  VNode,
  VNodeProps,
  NormalizedProps,
  VNodeChild,
  ComponentType,
  HFunction,
} from './h';

// Re-export from shared (diff)
export type { VNodeType } from '@upfault/shared/diff';
export { VNodeType } from '@upfault/shared/diff';

// Re-export from shared (diff)
export type { Component, ComponentInstance, VNodeProps as SharedVNodeProps, PatchFlags } from '@upfault/shared/diff';

// 生命周期钩子
export {
  onBeforeMount,
  onMounted,
  onBeforeUpdate,
  onUpdated,
  onBeforeUnmount,
  onUnmounted,
  onActivated,
  onDeactivated,
  onErrorCaptured,
  onRenderTracked,
  onRenderTriggered,
  getCurrentInstance,
  setCurrentInstance,
} from './lifecycle';

export type {
  LifecycleHook,
  LifecycleHooks,
  ComponentInstance as LifecycleComponentInstance,
} from './lifecycle';

// 渲染器
export { createRenderer, defaultRendererOptions } from './renderer-options';
export type { RendererOptions } from './renderer-options';

// Reactivity (re-export from @upfault/reactivity)
export {
  ref,
  shallowRef,
  readonlyRef,
  isRef,
  unref,
  toRef,
  toRefs,
  computed,
  watch,
  watchEffect,
  effect,
  batch,
} from '@upfault/reactivity';

export type {
  Ref,
  ReadonlyRef,
  ComputedRef,
  Reactive,
  ReadonlyReactive,
  ShallowReactive,
  WatchOptions,