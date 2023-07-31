/**
 * UpFault Reactivity - Watch Module
 * 
 * Watch 实现：监听响应式数据变化
 */

import { 
  track, 
  trigger, 
  createDep, 
  createEffect, 
  stopEffect, 
  runEffect,
  runEffectSync,
  getCurrentEffect,
  isRef,
  isFunction,
  isArray,
  hasChanged,
} from './dep';

import type { 
  WatchOptions, 
  WatchCallback, 
  WatchSource, 
  WatchStopHandle,
  DebuggerEvent
} from '@upfault/shared';

/**
 * 深度比较是否变化
 */
function hasChangedDeep(a: any, b: any): boolean {
  // Unwrap Proxies to compare target objects
  const unwrap = (val: any) => {
    // Check if it's our reactive proxy (has a specific marker)
    return val && val.__v_isReactive ? val.__v_raw : val;
  };
  
  const aUnwrapped = unwrap(a);
  const bUnwrapped = unwrap(b);
  
  if (aUnwrapped === bUnwrapped) return false;
  if (aUnwrapped === null || bUnwrapped === null) return true;
  if (typeof aUnwrapped !== 'object' || typeof bUnwrapped !== 'object') return aUnwrapped !== bUnwrapped;
  
  const keysA = Object.keys(aUnwrapped);
  const keysB = Object.keys(bUnwrapped);
  
  if (keysA.length !== keysB.length) return true;
  
  for (const key of keysA) {
    if (!keysB.includes(key)) return true;
    if (hasChangedDeep(aUnwrapped[key], bUnwrapped[key])) return true;
  }
  
  return false;
}

function deepClone(val: any): any {
  if (val === null || typeof val !== 'object') return val;
  if (Array.isArray(val)) return val.map(deepClone);
  const cloned: any = {};
  for (const key in val) {
    cloned[key] = deepClone(val[key]);
  }
  return cloned;
}

/**
 * 创建 watch
 */
export function watch<T>(
  source: WatchSource<T>,
  callback: WatchCallback<T>,
  options?: WatchOptions
): WatchStopHandle {
  let getter: () => any;
  
  if (isRef(source)) {
    getter = () => source.value;
  } else if (isFunction(source)) {
    getter = source;
  } else if (isArray(source)) {
    getter = () => source.map(s => isRef(s) ? s.value : s);
  } else {
    getter = () => source;
  }
  
  let cleanup: (() => void) | undefined;
  
  const onCleanup = (fn: () => void) => {
    cleanup = fn;
  };
  
  // For deep watch, store a snapshot (deep clone) to avoid mutation issues
  const isDeep = options?.deep === true;
  let oldValueSnapshot = isDeep ? deepClone(getter()) : getter();
  let oldValue = getter();
  
  const job = () => {
    const currentEffect = getCurrentEffect();
    if (!currentEffect || !currentEffect.active) return;
    
    const newValue = getter();
    
    const changed = isDeep 
      ? hasChangedDeep(newValue, oldValueSnapshot)
      : hasChanged(newValue, oldValue);
    
    if (changed) {
      // Pass onCleanup only if callback expects it (length >= 3)
      let cleanupFn: (() => void) | undefined;
      const onCleanup = (fn: () => void) => {
        cleanupFn = fn;
      };
      
      if (callback.length >= 3) {
        callback(newValue, isDeep ? oldValueSnapshot : oldValue, onCleanup);
      } else {
        callback(newValue, isDeep ? oldValueSnapshot : oldValue, undefined);
      }
      
      // Call cleanup after callback (like finally)
      if (cleanupFn) cleanupFn();
      
      // Update snapshots
      oldValue = newValue;
      if (isDeep) {
        oldValueSnapshot = deepClone(newValue);
      }
    }
  };
  
  const effect = createEffect(job, {
    lazy: true,
    scheduler: (fn) => {
      if (options?.flush === 'sync') {
        runEffectSync(effect);
      } else if (options?.flush === 'post') {
        queueMicrotask(() => runEffectSync(effect));
      } else {
        // Default to sync for predictable test behavior
        runEffectSync(effect);