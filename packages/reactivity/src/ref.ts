/**
 * UpFault Reactivity - Ref Module
 * 
 * Ref 实现：基于 Proxy + 依赖追踪的响应式引用
 */

import { track, trigger, createDep, isRef, unref, toRef, toRefs, shallowRef, readonlyRef, hasChanged } from './dep';

import type { Ref, ReadonlyRef } from '@upfault/shared';

let proxyId = 0;