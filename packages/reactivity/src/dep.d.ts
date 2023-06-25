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