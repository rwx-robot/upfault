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