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