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
 * 判断是否为响应式对象
 */
export function isReactive(value) {
    return isObject(value) && value.__v_isReactive === true;
}
/**
 * 判断是否为只读响应式
 */
export function isReadonly(value) {
    return isObject(value) && value.__v_isReadonly === true;
}
/**
 * 判断是否为 VNode
 */
export function isVNode(value) {
    return isObject(value) && '__v_isVNode' in value;
}
/**
 * 空函数
 */
export const NOOP = () => { };
/**
 * 标识函数
 */
export const IDENTITY = (v) => v;
/**
 * 判断值是否变化 (用于响应式比较)
 */
export function hasChanged(a, b) {
    return a !== b && (a === a || b === b); // NaN 检查
}
/**
 * 安全的数组推平
 */
export function flatten(arr) {
    return arr.reduce((acc, val) => {
        return acc.concat(Array.isArray(val) ? flatten(val) : [val]);
    }, []);
}
/**
 * 生成唯一 ID (单调递增)
 */
let uidCounter = 0;
export function generateId(prefix = '') {
    return `${prefix}${++uidCounter}_${Date.now().toString(36)}`;
}
/**
 * 生成唯一数字 ID
 */
let numericIdCounter = 0;
export function generateNumericId() {
    return ++numericIdCounter;
}
/**
 * 深度克隆 (仅支持 JSON 兼容类型)
 */
export function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}
/**
 * 对象浅拷贝合并
 */
export function mergeObjects(target, source) {
    return { ...target, ...source };
}
/**
 * 数组去重 (保持顺序)
 */
export function unique(arr) {
    return [...new Set(arr)];
}
/**
 * 数组分块
 */
export function chunk(arr, size) {