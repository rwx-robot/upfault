/**
 * UpFault Reactivity - Ref Module
 *
 * Ref 实现：基于 Proxy + 依赖追踪的响应式引用
 */
import { track, trigger, createDep, hasChanged } from './dep';
let proxyId = 0;
function createReactiveObject(obj, dep) {
    const id = ++proxyId;