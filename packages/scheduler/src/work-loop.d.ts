/**
 * UpFault Scheduler - Work Loop (时间分片工作循环)
 *
 * 核心调度逻辑：
 * 1. shouldYield() - 判断是否应让出主线程
 * 2. workLoop() - 主工作循环
 * 3. scheduleCallback() - 调度任务入口
 * 4. cancelCallback() - 取消任务
 *
 * 硬件感知：可配置 timeSliceBudget，默认 5ms (留 11ms 给浏览器渲染)
 * 渐进增强：有 requestIdleCallback 用它，没有用 setTimeout 兜底
 */
import { Priority, SchedulerTask, SchedulerOptions } from '@upfault/shared';
import { PriorityQueue, SchedulerStats } from './queue';
export type { SchedulerTask, SchedulerOptions, SchedulerStats, Priority, TaskQueue } from '@upfault/shared';
export { DEFAULT_SCHEDULER_OPTIONS } from '@upfault/shared';
export { PriorityQueue, createSchedulerTask, generateTaskId } from './queue';
interface SchedulerState {
    taskQueue: PriorityQueue;
    timerQueue: PriorityQueue;
    currentTask: SchedulerTask | null;
    deadline: number;
    isPerformingWork: boolean;
    isHostCallbackScheduled: boolean;
    hostCallbackId: number | null;
    stats: SchedulerStats;
    options: SchedulerOptions;
}
/**
 * 创建调度器实例
 */
export declare function createScheduler(options?: Partial<SchedulerOptions>): Scheduler;
/**
 * 调度器类
 */
export declare class Scheduler {
    private state;
    constructor(state: SchedulerState);
    /**
     * 调度任务 - 主入口
     * @param task 调度任务
     * @returns 任务 ID (用于取消)
     */
    scheduleCallback(task: SchedulerTask): number;
    /**
     * 取消任务
     */
    cancelCallback(taskId: number): boolean;
    /**
     * 刷新所有同步任务 (IMMEDIATE 优先级)
     */
    flushSync(): void;
    /**
     * 获取调度器统计信息
     */
    getStats(): SchedulerStats;
    /**
     * 获取当前选项
     */
    getOptions(): SchedulerOptions;
    /**
     * 测试专用：手动触发一次工作循环迭代
     * 仅用于测试环境，配合 fake timers 使用
     */
    __test_step(currentTime?: number): void;
    /**
     * 请求宿主回调 (requestIdleCallback / setTimeout 兜底)
     */