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
