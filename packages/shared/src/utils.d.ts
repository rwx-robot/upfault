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
export declare function deepClone<T>(obj: T): T;
/**
 * 对象浅拷贝合并
 */
export declare function mergeObjects<T extends object, U extends object>(target: T, source: U): T & U;
/**
 * 数组去重 (保持顺序)
 */
export declare function unique<T>(arr: T[]): T[];
/**
 * 数组分块
 */
export declare function chunk<T>(arr: T[], size: number): T[][];
/**
 * 防抖
 */
export declare function debounce<T extends (...args: unknown[]) => unknown>(fn: T, delay: number): (...args: Parameters<T>) => void;
/**
 * 节流
 */
export declare function throttle<T extends (...args: unknown[]) => unknown>(fn: T, limit: number): (...args: Parameters<T>) => void;
/**
 * 扁平化树结构 (深度优先)
 */
export declare function flattenTree<T>(nodes: T[], getChildren: (node: T) => T[] | undefined): T[];
/**
 * 遍历树 (广度优先)
 */
export declare function traverseTreeBFS<T>(root: T, getChildren: (node: T) => T[] | undefined, visitor: (node: T, depth: number) => boolean | void): void;
/**
 * 性能计时器
 */
export declare class PerformanceTimer {
    private startTime;
    private endTime;
    private running;
    start(): this;
    stop(): number;
    get elapsed(): number;
    reset(): this;
}
/**
 * 简单的 LRU 缓存
 */
export declare class LRUCache<K, V> {
    private cache;
    private readonly maxSize;
    constructor(maxSize?: number);
    get(key: K): V | undefined;
    set(key: K, value: V): this;
    has(key: K): boolean;
    delete(key: K): boolean;
    clear(): void;
    get size(): number;
    keys(): IterableIterator<K>;
    values(): IterableIterator<V>;
    entries(): IterableIterator<[K, V]>;
}
/**
 * 类型守卫：缩小联合类型
 */
export declare function isType<T>(value: unknown, guard: (v: unknown) => v is T): value is T;
/**
 * 断言函数 (开发环境检查)
 */
export declare function assert(condition: unknown, message?: string): asserts condition;
/**
 * 开发环境警告
 */
export declare function warn(message: string, ...args: unknown[]): void;
/**
 * 开发环境错误
 */
export declare function error(message: string, ...args: unknown[]): void;
/**
 * 类型定义 (前向声明，避免循环依赖)
 */
interface VNodeLike {
    type: unknown;
    key: string | number | null;
}
interface Ref<T> {
    value: T;
    __v_isRef: true;
}
interface ComputedRef<T> {
    value: T;
    __v_isComputed: true;
}