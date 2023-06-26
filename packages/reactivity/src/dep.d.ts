/**
 * UpFault Reactivity - Dependency Tracking Core
 *
 * 核心依赖追踪系统，基于 Vue 3 / SolidJS 设计
 * 支持 effect、ref、computed、watch 的依赖收集与触发
 */
import type { Dep, Effect, DebuggerEvent, Ref } from '@upfault/shared';
/**
 * 获取当前活跃的 effect
 */
export declare function getCurrentEffect(): Effect | undefined;
/**
 * 推入 effect 到栈中
 */
export declare function pushEffect(effect: Effect): void;
/**
 * 弹出 effect 栈
 */
export declare function popEffect(): Effect | undefined;
/**
 * 依赖收集：建立 effect 与 dep 的双向关联
 * @param dep 依赖对象
 * @param event 调试事件信息
 */
export declare function track(dep: Dep, event?: DebuggerEvent): void;
/**
 * 依赖触发：通知所有订阅的 effect 重新执行
 * @param dep 依赖对象
 * @param event 调试事件信息
 */
export declare function trigger(dep: Dep, event?: DebuggerEvent): void;
/**
 * 创建 Dep 对象
 */
export declare function createDep(name?: string): Dep;
/**
 * 创建 Effect 对象
 */
export declare function createEffect(fn: () => void, options?: {
    scheduler?: (fn: () => void) => void;
    onTrack?: (event: DebuggerEvent) => void;
    onTrigger?: (event: DebuggerEvent) => void;
    allowRecurse?: boolean;
}): Effect;
/**
 * 停止 effect
 */
export declare function stopEffect(effect: Effect): void;
/**
 * 暂停 effect
 */
export declare function pauseEffect(effect: Effect): void;
/**
 * 恢复 effect
 */
export declare function resumeEffect(effect: Effect): void;
/**
 * 批量执行函数，暂停依赖收集
 */
export declare function pauseTracking(): void;
/**
 * 恢复依赖收集
 */
export declare function resetTracking(): void;
/**
 * 判断是否为 Ref
 */
export declare function isRef<T>(val: any): val is Ref<T>;
/**
 * 解包 ref
 */
export declare function unref<T>(ref: T | Ref<T>): T;
/**
 * 转换为 ref
 */
export declare function toRef<T>(object: any, key: string): Ref<any>;
/**
 * 转换对象所有属性为 ref
 */
export declare function toRefs<T extends object>(object: T): {
    [K in keyof T]: Ref<T[K]>;
};
/**
 * 创建 shallow ref
 */
export declare function shallowRef<T>(value: T): Ref<T>;
/**
 * 创建 readonly ref
 */
export declare function readonlyRef<T>(value: T): Readonly<Ref<T>>;
/**
 * 判断是否为函数
 */
export declare function isFunction(val: any): val is Function;
/**
 * 判断是否为数组
 */
export declare function isArray(val: any): val is any[];
/**
 * 判断值是否变化
 */