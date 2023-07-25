/**
 * UpFault Reactivity - Watch Module
 *
 * Watch 实现：监听响应式数据变化
 */
import { createEffect, stopEffect, runEffectSync, getCurrentEffect, isRef, isFunction, isArray, hasChanged, } from './dep';
/**
 * 深度比较是否变化
 */
function hasChangedDeep(a, b) {
    // Unwrap Proxies to compare target objects
    const unwrap = (val) => {
        // Check if it's our reactive proxy (has a specific marker)
        return val && val.__v_isReactive ? val.__v_raw : val;
    };
    const aUnwrapped = unwrap(a);
    const bUnwrapped = unwrap(b);
    if (aUnwrapped === bUnwrapped)
        return false;
    if (aUnwrapped === null || bUnwrapped === null)
        return true;
    if (typeof aUnwrapped !== 'object' || typeof bUnwrapped !== 'object')
        return aUnwrapped !== bUnwrapped;
    const keysA = Object.keys(aUnwrapped);
    const keysB = Object.keys(bUnwrapped);
    if (keysA.length !== keysB.length)
        return true;
    for (const key of keysA) {
        if (!keysB.includes(key))
            return true;
        if (hasChangedDeep(aUnwrapped[key], bUnwrapped[key]))
            return true;
    }
    return false;
}
function deepClone(val) {
    if (val === null || typeof val !== 'object')
        return val;
    if (Array.isArray(val))
        return val.map(deepClone);
    const cloned = {};
    for (const key in val) {
        cloned[key] = deepClone(val[key]);
    }
    return cloned;
}
/**
 * 创建 watch
 */
export function watch(source, callback, options) {
    let getter;
    if (isRef(source)) {
        getter = () => source.value;
    }
    else if (isFunction(source)) {
        getter = source;
    }
    else if (isArray(source)) {
        getter = () => source.map(s => isRef(s) ? s.value : s);