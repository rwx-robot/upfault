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
export function onBeforeUnmount(hook: LifecycleHook, instance?: ComponentInstance): void {
  injectHook('onBeforeUnmount', hook, instance);
}

/**
 * 组件卸载后调用
 */
export function onUnmounted(hook: LifecycleHook, instance?: ComponentInstance): void {
  injectHook('onUnmounted', hook, instance);
}

/**
 * KeepAlive 激活时调用
 */
export function onActivated(hook: LifecycleHook, instance?: ComponentInstance): void {
  injectHook('onActivated', hook, instance);
}

/**
 * KeepAlive 停用时调用
 */
export function onDeactivated(hook: LifecycleHook, instance?: ComponentInstance): void {
  injectHook('onDeactivated', hook, instance);
}

/**
 * 捕获后代组件错误
 */
export function onErrorCaptured(
  hook: (error: Error, instance: ComponentInstance, info: string) => boolean | void,
  instance?: ComponentInstance
): void {
  injectHook('onErrorCaptured', hook, instance);
}

/**
 * 调试：渲染依赖追踪
 */
export function onRenderTracked(hook: (event: any) => void, instance?: ComponentInstance): void {
  injectHook('onRenderTracked', hook, instance);
}

/**
 * 调试：渲染触发
 */
export function onRenderTriggered(hook: (event: any) => void, instance?: ComponentInstance): void {
  injectHook('onRenderTriggered', hook, instance);
}

// ============================================================================
// 生命周期执行工具
// ============================================================================

/**
 * 执行生命周期钩子数组
 */
export async function callHooks(
  hooks: LifecycleHook[] | undefined,
  instance: ComponentInstance,
  errorInfo?: string
): Promise<void> {
  if (!hooks || hooks.length === 0) return;
  
  for (const hook of hooks) {
    try {
      const result = hook();
      if (result instanceof Promise) {
        await result;
      }
    } catch (err) {
      handleError(err as Error, instance, errorInfo || 'lifecycle hook');
    }
  }
}

/**
 * 调用 onBeforeMount
 */
export function callBeforeMount(instance: ComponentInstance): void {
  // 同步执行
  if (instance.onBeforeMount && instance.onBeforeMount.length > 0) {
    for (const hook of instance.onBeforeMount) {
      try {
        hook();
      } catch (err) {
        handleError(err as Error, instance, 'beforeMount');
      }
    }
  }
}

/**
 * 调用 onMounted
 */
export async function callMounted(instance: ComponentInstance): Promise<void> {
  await callHooks(instance.onMounted, instance, 'mounted');
}

/**
 * 调用 onBeforeUpdate
 */
export async function callBeforeUpdate(instance: ComponentInstance): Promise<void> {
  await callHooks(instance.onBeforeUpdate, instance, 'beforeUpdate');
}

/**
 * 调用 onUpdated
 */
export async function callUpdated(instance: ComponentInstance): Promise<void> {
  await callHooks(instance.onUpdated, instance, 'updated');
}

/**
 * 调用 onBeforeUnmount
 */
export function callBeforeUnmount(instance: ComponentInstance): void {
  if (instance.onBeforeUnmount && instance.onBeforeUnmount.length > 0) {
    for (const hook of instance.onBeforeUnmount) {
      try {
        hook();
      } catch (err) {
        handleError(err as Error, instance, 'beforeUnmount');
      }
    }
  }
}

/**
 * 调用 onUnmounted
 */
export function callUnmounted(instance: ComponentInstance): void {
  if (instance.onUnmounted && instance.onUnmounted.length > 0) {
    for (const hook of instance.onUnmounted) {
      try {
        hook();
      } catch (err) {
        handleError(err as Error, instance, 'unmounted');
      }
    }
  }
}

/**
 * 调用 onActivated
 */
export async function callActivated(instance: ComponentInstance): Promise<void> {
  await callHooks(instance.onActivated, instance, 'activated');
}

/**
 * 调用 onDeactivated
 */
export async function callDeactivated(instance: ComponentInstance): Promise<void> {
  await callHooks(instance.onDeactivated, instance, 'deactivated');
}

// ============================================================================
// 渲染副作用管理
// ============================================================================

/**
 * 创建渲染 effect
 * 用于组件的响应式更新
 */
export function createRenderEffect(
  instance: ComponentInstance,
  renderFn: () => VNode | null
): Effect {
  const runner = effect(renderFn, {
    lazy: true,
    scheduler: () => {
      // 调度更新
      queueRenderJob(instance);
    },
    onTrack: instance.onRenderTracked ? instance.onRenderTracked[0] : undefined,
    onTrigger: instance.onRenderTriggered ? instance.onRenderTriggered[0] : undefined,
  });
  // effect() 返回 runner，实际 Effect 在 runner.effect
  return runner.effect;