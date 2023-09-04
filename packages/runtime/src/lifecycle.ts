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