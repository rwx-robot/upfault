/**
 * UpFault Utilities - 通用工具函数
 *
 * 纯函数、无副作用、可 Tree-shaking
 */
/**
 * 判断两个值是否为同一节点 (用于 Diff)
 */
export function isSameNode(a, b) {
    return a.type === b.type && a.key === b.key;
}
/**
 * 判断是否为对象
 */
export function isObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}
/**
 * 判断是否为函数
 */
export function isFunction(value) {
    return typeof value === 'function';
}
/**
 * 判断是否为字符串
 */
export function isString(value) {
    return typeof value === 'string';
}
/**
 * 判断是否为数字
 */
export function isNumber(value) {
    return typeof value === 'number' && !Number.isNaN(value);
}
/**
 * 判断是否为 Promise
 */
export function isPromise(value) {
    return isObject(value) && isFunction(value.then);
}
/**
 * 判断是否为 Ref
 */
export function isRef(value) {
    return isObject(value) && value.__v_isRef === true;
}
/**
 * 判断是否为 ComputedRef
 */
export function isComputedRef(value) {
    return isObject(value) && value.__v_isComputed === true;
}
/**
