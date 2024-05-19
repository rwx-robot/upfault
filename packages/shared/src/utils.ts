/**
 * UpFault Utilities - 通用工具函数
 * 
 * 纯函数、无副作用、可 Tree-shaking
 */

/**
 * 判断两个值是否为同一节点 (用于 Diff)
 */
export function isSameNode(a: VNodeLike, b: VNodeLike): boolean {
  return a.type === b.type && a.key === b.key;
}

/**
 * 判断是否为对象
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * 判断是否为函数
 */
export function isFunction(value: unknown): value is Function {
  return typeof value === 'function';
}

/**
 * 判断是否为字符串
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/**
 * 判断是否为数字
 */
export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !Number.isNaN(value);
}

/**
 * 判断是否为 Promise
 */
export function isPromise<T>(value: unknown): value is Promise<T> {
  return isObject(value) && isFunction((value as any).then);
}

/**
 * 判断是否为 Ref
 */
export function isRef<T>(value: unknown): value is Ref<T> {
  return isObject(value) && (value as any).__v_isRef === true;
}

/**
 * 判断是否为 ComputedRef
 */
export function isComputedRef<T>(value: unknown): value is ComputedRef<T> {
  return isObject(value) && (value as any).__v_isComputed === true;
}

/**
 * 判断是否为响应式对象
 */
export function isReactive(value: unknown): value is Reactive<Record<string, unknown>> {
  return isObject(value) && (value as any).__v_isReactive === true;
}

/**
 * 判断是否为只读响应式
 */
export function isReadonly(value: unknown): boolean {
  return isObject(value) && (value as any).__v_isReadonly === true;
}

/**
 * 判断是否为 VNode
