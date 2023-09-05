/**
 * UpFault Runtime - 组件生命周期钩子
 * 
 * 生命周期管理，参考 Vue 3 设计
 */

import { effect, watchEffect, stopEffect } from '@upfault/reactivity';
import type { ComponentInstance, VNode } from '@upfault/shared/diff';

import type { Effect } from '@upfault/reactivity';

// ============================================================================
// 生命周期钩子类型
// ============================================================================

export type LifecycleHook = () => void | Promise<void>;

export interface LifecycleHooks {
  onBeforeMount?: LifecycleHook;
  onMounted?: LifecycleHook;
  onBeforeUpdate?: LifecycleHook;
  onUpdated?: LifecycleHook;
  onBeforeUnmount?: LifecycleHook;
  onUnmounted?: LifecycleHook;
  onActivated?: LifecycleHook;
  onDeactivated?: LifecycleHook;
  onErrorCaptured?: (error: Error, instance: ComponentInstance, info: string) => boolean | void;
  onRenderTracked?: (event: any) => void;
  onRenderTriggered?: (event: any) => void;
}

// ============================================================================
// 全局当前实例
// ============================================================================

let currentInstance: ComponentInstance | null = null;
export const instanceStack: ComponentInstance[] = [];

/**
 * 获取当前组件实例
 */
export function getCurrentInstance(): ComponentInstance | null {
  return currentInstance;
}

/**
 * 设置当前组件实例
 */
export function setCurrentInstance(instance: ComponentInstance | null): void {
  currentInstance = instance;
}

/**
 * 推入实例栈
 */
export function pushInstance(instance: ComponentInstance): void {
  instanceStack.push(instance);
  currentInstance = instance;
}

/**
 * 弹出实例栈
 */
export function popInstance(): ComponentInstance | null {
  const instance = instanceStack.pop();
  currentInstance = instanceStack[instanceStack.length - 1] || null;
  return instance;
}

// ============================================================================
// 生命周期注册函数
// ============================================================================

function injectHook(
  hookName: keyof LifecycleHooks,
  hook: LifecycleHook,
  instance: ComponentInstance | null = currentInstance
): boolean {
  if (!instance) {
    warn(`[UpFault] ${hookName} 只能在 setup() 或组件初始化时调用`);
    return false;
  }
  
  if (!instance[hookName]) {
    instance[hookName] = [];
  }
  
  (instance[hookName] as LifecycleHook[]).push(hook);
  return true;
}

/**
 * 组件挂载前调用
 */
export function onBeforeMount(hook: LifecycleHook, instance?: ComponentInstance): void {
  injectHook('onBeforeMount', hook, instance);
}

/**
 * 组件挂载后调用
 */
export function onMounted(hook: LifecycleHook, instance?: ComponentInstance): void {
  injectHook('onMounted', hook, instance);
}

/**
 * 组件更新前调用
 */
export function onBeforeUpdate(hook: LifecycleHook, instance?: ComponentInstance): void {
  injectHook('onBeforeUpdate', hook, instance);
}

/**
 * 组件更新后调用
 */
export function onUpdated(hook: LifecycleHook, instance?: ComponentInstance): void {
  injectHook('onUpdated', hook, instance);
}

/**
 * 组件卸载前调用
 */