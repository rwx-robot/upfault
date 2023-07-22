/**
 * UpFault Reactivity - Ref Module
 * 
 * Ref 实现：基于 Proxy + 依赖追踪的响应式引用
 */

import { track, trigger, createDep, isRef, unref, toRef, toRefs, shallowRef, readonlyRef, hasChanged } from './dep';

import type { Ref, ReadonlyRef } from '@upfault/shared';

let proxyId = 0;
function createReactiveObject(obj: any, dep: any): any {
  const id = ++proxyId;
  const proxy = new Proxy(obj, {
    get(target, key, receiver) {
      track(dep);
      return Reflect.get(target, key, receiver);
    },
    set(target, key, value, receiver) {
      const result = Reflect.set(target, key, value, receiver);
      trigger(dep);
      return result;
    }
  });
  // Mark the proxy for identification
  Object.defineProperty(proxy, '__v_isReactive', { value: true, writable: false, enumerable: false, configurable: false });
  Object.defineProperty(proxy, '__v_raw', { value: obj, writable: false, enumerable: false, configurable: false });
  return proxy;
}

/**
 * 创建 ref
 * @param value 初始值