/**
 * UpFault Scheduler Types - 优先级调度器核心类型
 *
 * 基于 React Fiber + Vue 3 调度思想，针对 Block 级粒度优化
 * 支持时间分片、优先级抢占、依赖感知调度
 */
export declare const enum Priority {
    /** 同步立即执行 - 用户输入、动画帧 */
    IMMEDIATE = 0,
    /** 用户阻塞级 - 拖拽、滚动、交互反馈 (250ms 内) */
    USER_BLOCKING = 250,
    /** 正常优先级 - 默认渲染、数据更新 (5s 内) */
    NORMAL = 5000,
    /** 低优先级 - 非可视区域、预取数据 (10s 内) */
    LOW = 10000,
    /** 空闲优先级 - 后台计算、GC、预编译 (无截止时间) */
    IDLE = 2147483647
}
/**
 * 优先级人类可读名称
 */
export declare const PriorityNames: Record<Priority, string>;
/**
 * 从过期时间推算优先级
 */
export declare function priorityFromExpirationTime(expirationTime: number): Priority;
/**
 * 计算过期时间 (ms)
 */
export declare function computeExpirationTime(priority: Priority): number;
/**
 * 调度任务接口
 * 每个 Block / 组件更新对应一个任务
 */
export interface SchedulerTask<T = unknown> {
    /** 唯一任务 ID (单调递增) */
    id: number;
    /** 优先级 */
    priority: Priority;
    /** 执行回调 */