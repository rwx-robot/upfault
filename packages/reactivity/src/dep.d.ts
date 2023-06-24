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