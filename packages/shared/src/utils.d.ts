/**
 * UpFault Utilities - 通用工具函数
 *
 * 纯函数、无副作用、可 Tree-shaking
 */
/**
 * 判断两个值是否为同一节点 (用于 Diff)
 */
export declare function isSameNode(a: VNodeLike, b: VNodeLike): boolean;
/**
 * 判断是否为对象
 */
export declare function isObject(value: unknown): value is Record<string, unknown>;
/**
 * 判断是否为函数
 */
export declare function isFunction(value: unknown): value is Function;
/**
 * 判断是否为字符串
 */
export declare function isString(value: unknown): value is string;
/**
 * 判断是否为数字
 */
export declare function isNumber(value: unknown): value is number;
/**
 * 判断是否为 Promise
 */
export declare function isPromise<T>(value: unknown): value is Promise<T>;
/**
 * 判断是否为 Ref
 */
export declare function isRef<T>(value: unknown): value is Ref<T>;
/**
 * 判断是否为 ComputedRef
 */
export declare function isComputedRef<T>(value: unknown): value is ComputedRef<T>;
/**
 * 判断是否为响应式对象
 */
export declare function isReactive(value: unknown): value is Reactive<Record<string, unknown>>;
/**
 * 判断是否为只读响应式
 */
export declare function isReadonly(value: unknown): boolean;
/**
 * 判断是否为 VNode
 */
export declare function isVNode(value: unknown): value is VNode;
/**
 * 空函数
 */
export declare const NOOP: () => void;
/**
 * 标识函数
 */
export declare const IDENTITY: <T>(v: T) => T;
/**
 * 判断值是否变化 (用于响应式比较)
 */
export declare function hasChanged(a: unknown, b: unknown): boolean;
/**
 * 安全的数组推平
 */
export declare function flatten<T>(arr: (T | T[])[]): T[];
export declare function generateId(prefix?: string): string;
export declare function generateNumericId(): number;
/**
 * 深度克隆 (仅支持 JSON 兼容类型)
 */