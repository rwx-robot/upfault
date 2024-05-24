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
 */
export function isVNode(value: unknown): value is VNode {
  return isObject(value) && '__v_isVNode' in value;
}

/**
 * 空函数
 */
export const NOOP = (): void => {};

/**
 * 标识函数
 */
export const IDENTITY = <T>(v: T) => v;

/**
 * 判断值是否变化 (用于响应式比较)
 */
export function hasChanged(a: unknown, b: unknown): boolean {
  return a !== b && (a === a || b === b); // NaN 检查
}

/**
 * 安全的数组推平
 */
export function flatten<T>(arr: (T | T[])[]): T[] {
  return arr.reduce((acc: T[], val: T | T[]) => {
    return acc.concat(Array.isArray(val) ? flatten(val) : [val]);
  }, [] as T[]);
}

/**
 * 生成唯一 ID (单调递增)
 */
let uidCounter = 0;
export function generateId(prefix = ''): string {
  return `${prefix}${++uidCounter}_${Date.now().toString(36)}`;
}

/**
 * 生成唯一数字 ID
 */
let numericIdCounter = 0;
export function generateNumericId(): number {
  return ++numericIdCounter;
}

/**
 * 深度克隆 (仅支持 JSON 兼容类型)
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * 对象浅拷贝合并
 */
export function mergeObjects<T extends object, U extends object>(target: T, source: U): T & U {
  return { ...target, ...source };
}

/**
 * 数组去重 (保持顺序)
 */
export function unique<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}

/**
 * 数组分块
 */
export function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

/**
 * 防抖
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

/**
 * 节流
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  limit: number