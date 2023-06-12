/**
 * UpFault Reactivity - Computed Module
 *
 * 计算属性实现：基于 lazy effect + 依赖追踪
 */
import type { ComputedRef, ComputedGetter, ComputedSetter } from '@upfault/shared';
interface ComputedOptions<T> {
    get: ComputedGetter<T>;
    set?: ComputedSetter<T>;
}
/**
 * 创建计算属性
 */
export declare function computed<T>(getter: ComputedGetter<T>): ComputedRef<T>;
export declare function computed<T>(options: ComputedOptions<T>): ComputedRef<T>;