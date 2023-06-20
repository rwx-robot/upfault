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