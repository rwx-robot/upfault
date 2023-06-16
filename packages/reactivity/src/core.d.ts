/**
 * UpFault Reactivity - Effect System
 *
 * 副作用管理：effect、watchEffect、watch、computed 的基础实现
 */
import type { Effect, Ref, ComputedRef } from '@upfault/shared';
/**
 * 创建响应式 effect
 * @param fn effect 函数
 * @param options 配置选项
 * @returns runner 函数（带有 stop 方法）
 */
export declare function effect(fn: () => void, options?: {
    lazy?: boolean;
    scheduler?: (fn: () => void) => void;
    onTrack?: (event: any) => void;
    onTrigger?: (event: any) => void;
    allowRecurse?: boolean;
}): (() => void) & {
    stop: () => void;
    effect: Effect;
};
/**
 * 创建 watchEffect
 */
export declare function watchEffect(fn: () => void, options?: {
    flush?: 'pre' | 'post' | 'sync';
    onTrack?: (event: any) => void;
    onTrigger?: (event: any) => void;
}): () => void;
/**
 * 批量执行
 */
export declare function batch(fn: () => void): void;
/**
 * 创建 ref
 */
export declare function ref<T>(value: T): Ref<T>;
/**
 * 创建 computed
 */
export declare function computed<T>(getter: () => T): ComputedRef<T>;
