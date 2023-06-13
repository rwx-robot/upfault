/**
 * UpFault Reactivity - Computed Module
 * 
 * 计算属性实现：基于 lazy effect + 依赖追踪
 */

import { track, trigger, createDep, createEffect, runEffectSync } from './dep';

import type { ComputedRef, ComputedGetter, ComputedSetter } from '@upfault/shared';

interface ComputedOptions<T> {
  get: ComputedGetter<T>;
  set?: ComputedSetter<T>;
}

/**
 * 创建计算属性
 */