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