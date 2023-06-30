/**
 * UpFault Reactivity - Dependency Tracking Core
 *
 * 核心依赖追踪系统，基于 Vue 3 / SolidJS 设计
 * 支持 effect、ref、computed、watch 的依赖收集与触发
 */
/**
 * 当前正在执行的 effect 栈
 */
const effectStack = [];
/**
 * 获取当前活跃的 effect
 */
export function getCurrentEffect() {
    return effectStack[effectStack.length - 1];
}
/**
 * 推入 effect 到栈中
 */
export function pushEffect(effect) {
    effectStack.push(effect);
}
/**
 * 弹出 effect 栈
 */
export function popEffect() {
    return effectStack.pop();
}
/**
 * 依赖收集：建立 effect 与 dep 的双向关联
 * @param dep 依赖对象
 * @param event 调试事件信息
 */
export function track(dep, event) {
    const effect = getCurrentEffect();
    if (!effect)
        return;
    // 建立 effect -> dep 的依赖关系
    if (!effect.deps.includes(dep)) {
        effect.deps.push(dep);
    }
    // 建立 dep -> effect 的订阅关系
    if (!dep.subs.has(effect)) {
        dep.subs.add(effect);
        dep.version++;
    }
    // 调试钩子
    if (effect.onTrack && event) {
        effect.onTrack(event);
    }
}
/**
 * 依赖触发：通知所有订阅的 effect 重新执行
 * @param dep 依赖对象
 * @param event 调试事件信息
 */
export function trigger(dep, event) {
    // 复制一份避免迭代过程中修改集合
    const effects = [...dep.subs];
    for (const effect of effects) {
        if (!effect.active)
            continue;
        // 避免递归触发
        if (!effect.allowRecurse && effectStack.includes(effect))
            continue;
        // 调试钩子
        if (effect.onTrigger && event) {
            effect.onTrigger(event);
        }
        // 执行 effect - 使用 runEffectSync 管理 effect 栈
        if (effect.scheduler) {
            effect.scheduler(effect.fn);
        }
        else {
            runEffectSync(effect);
        }
    }
}
/**
 * 创建 Dep 对象
 */
export function createDep(name) {
    return {
        subs: new Set(),
        version: 0,
        name,
    };
}
/**
 * 创建 Effect 对象
 */
export function createEffect(fn, options) {
    const effect = {
        fn,
        scheduler: options?.scheduler,
        deps: [],
        active: true,
        stopped: false,
        allowRecurse: options?.allowRecurse ?? false,
        onTrack: options?.onTrack,
        onTrigger: options?.onTrigger,
    };
    return effect;
}
/**
 * 停止 effect
 */
export function stopEffect(effect) {
    if (effect.stopped)
        return;
    effect.stopped = true;
    effect.active = false;
    // 从所有 dep 中移除
    for (const dep of effect.deps) {
        dep.subs.delete(effect);
    }
    effect.deps.length = 0;
}
/**
 * 暂停 effect
 */
export function pauseEffect(effect) {
    effect.active = false;
}
/**
 * 恢复 effect
 */
export function resumeEffect(effect) {
    effect.active = true;
}
/**
 * 批量执行函数，暂停依赖收集