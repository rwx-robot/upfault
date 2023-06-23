/**
 * UpFault Reactivity - Effect System
 * 
 * 副作用管理：effect、watchEffect、watch、computed 的基础实现
 */

import { 
  createEffect, 
  stopEffect, 
  pauseEffect, 
  resumeEffect,
  getCurrentEffect,
  pushEffect,
  popEffect,
  track,
  trigger,
  createDep,
  runEffect,
  runEffectSync,
  isRef,
  isFunction,
  isArray,
  hasChanged,
  unref,
  toRef,
  toRefs,
  shallowRef,
  readonlyRef,
} from './dep';

import type { 
  Effect, 
  Ref, 
  ComputedRef, 
  WatchOptions, 
  WatchCallback, 
  WatchSource, 
  WatchStopHandle,
  DebuggerEvent,
  TrackOpTypes,
  TriggerOpTypes
} from '@upfault/shared';

/**
 * Effect 栈深度限制
 */
const MAX_EFFECT_STACK_DEPTH = 100;

/**
 * 创建响应式 effect
 * @param fn effect 函数
 * @param options 配置选项
 * @returns runner 函数（带有 stop 方法）
 */
export function effect(fn: () => void, options?: {
  lazy?: boolean;
  scheduler?: (fn: () => void) => void;
  onTrack?: (event: any) => void;
  onTrigger?: (event: any) => void;
  allowRecurse?: boolean;
}): (() => void) & { stop: () => void; effect: Effect } {
  const effect = createEffect(fn, options);
  
  // For lazy effects, return a runner that triggers when called
  // For non-lazy effects, return a stop function
  const isLazy = options?.lazy === true;
  
  let runner: (() => void) & { stop: () => void; effect: Effect };
  
  if (isLazy) {
    runner = effect.fn.bind(effect) as (() => void) & { stop: () => void; effect: Effect };
    runner.effect = effect;
    runner.stop = () => stopEffect(effect);
  } else {
    // Non-lazy: return a stop function
    const stopFn = (() => stopEffect(effect)) as (() => void) & { stop: () => void; effect: Effect };
    stopFn.stop = stopFn;
    stopFn.effect = effect;
    runner = stopFn;
    // Run immediately for non-lazy
    runEffect(effect);
  }
  
  return runner;
}

/**
 * 创建 watchEffect
 */
export function watchEffect(fn: () => void, options?: {
  flush?: 'pre' | 'post' | 'sync';
  onTrack?: (event: any) => void;
  onTrigger?: (event: any) => void;
}): () => void {
  const runner = effect(fn, { lazy: false, ...options });
  return runner.stop;
}

/**
 * 批量执行
 */
export function batch(fn: () => void): void {
  fn();
}

/**
 * 创建 ref
 */
export function ref<T>(value: T): Ref<T> {
  const dep = createDep();
  
  const r = {
    get value(): T {
      track(dep);
      return value;
    },
    set value(newValue: T) {
      if (hasChanged(value, newValue)) {
        value = newValue;
        trigger(dep);
      }
    },
    __v_isRef: true,
  } as Ref<T>;
  
  return r;
}

/**
 * 创建 computed
 */
export function computed<T>(getter: () => T): ComputedRef<T> {
  const dep = createDep();
  let value: T;
  let dirty = true;
  
  const effect = createEffect(() => {
    value = getter();
    dirty = false;
    trigger(dep);
  }, {
    lazy: true,
    scheduler: () => {
      if (!dirty) {
        dirty = true;
        trigger(dep);
      }
    },
  });
  
  const computedRef = {
    get value(): T {
      if (dirty) {
        runEffectSync(effect);
      }
      track(dep);
      return value!;
    },
    set value(_: T) {
      console.warn('[UpFault] Computed ref is readonly');
    },
    __v_isRef: true,
    __v_isComputed: true,
    __v_isReadonly: true,
    effect,
  } as ComputedRef<T>;
  
  return computedRef;
}

// Re-export from dep.ts (only what's not defined locally)
