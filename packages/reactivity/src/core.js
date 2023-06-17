/**
 * UpFault Reactivity - Effect System
 *
 * 副作用管理：effect、watchEffect、watch、computed 的基础实现
 */
import { createEffect, stopEffect, track, trigger, createDep, runEffect, runEffectSync, hasChanged, } from './dep';
/**
 * Effect 栈深度限制
 */
const MAX_EFFECT_STACK_DEPTH = 100;
/**
 * 创建响应式 effect
 * @param fn effect 函数
 * @param options 配置选项
 * @returns runner 函数（带有 stop 方法）
 */
export function effect(fn, options) {
    const effect = createEffect(fn, options);
    // For lazy effects, return a runner that triggers when called
    // For non-lazy effects, return a stop function
    const isLazy = options?.lazy === true;
    let runner;
    if (isLazy) {
        runner = effect.fn.bind(effect);
        runner.effect = effect;
        runner.stop = () => stopEffect(effect);
    }
    else {
        // Non-lazy: return a stop function
        const stopFn = (() => stopEffect(effect));
        stopFn.stop = stopFn;
        stopFn.effect = effect;
        runner = stopFn;
        // Run immediately for non-lazy
        runEffect(effect);
    }
    return runner;
}
/**
 * 创建 watchEffect
 */
export function watchEffect(fn, options) {
    const runner = effect(fn, { lazy: false, ...options });
    return runner.stop;
}
/**
 * 批量执行
 */
export function batch(fn) {