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