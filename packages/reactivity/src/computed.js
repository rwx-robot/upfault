/**
 * UpFault Reactivity - Computed Module
 *
 * 计算属性实现：基于 lazy effect + 依赖追踪
 */
import { track, trigger, createDep, createEffect, runEffectSync } from './dep';
export function computed(getterOrOptions) {
    let getter;
    let setter;
    if (typeof getterOrOptions === 'function') {
        getter = getterOrOptions;
    }
    else {
        getter = getterOrOptions.get;
        setter = getterOrOptions.set;
    }
    const dep = createDep();
