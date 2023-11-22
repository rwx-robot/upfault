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
import { DEFAULT_SCHEDULER_OPTIONS } from '@upfault/shared';
import { PriorityQueue } from './queue';
export { DEFAULT_SCHEDULER_OPTIONS } from '@upfault/shared';
export { PriorityQueue, createSchedulerTask, generateTaskId } from './queue';
/**
 * 创建调度器实例
 */
export function createScheduler(options = {}) {
    const mergedOptions = { ...DEFAULT_SCHEDULER_OPTIONS, ...options };
    const state = {
        taskQueue: new PriorityQueue(),
        timerQueue: new PriorityQueue((a, b) => a.expirationTime - b.expirationTime),
        currentTask: null,
        deadline: 0,
        isPerformingWork: false,
        isHostCallbackScheduled: false,
        hostCallbackId: null,
        stats: {
            totalTasks: 0,
            completedTasks: 0,
            cancelledTasks: 0,
            queueLength: 0,
            avgExecutionTime: 0,
            totalExecutionTime: 0,
            preemptionCount: 0,
            priorityDistribution: {
                [0]: 0, // IMMEDIATE
                [250]: 0, // USER_BLOCKING
                [5000]: 0, // NORMAL
                [10000]: 0, // LOW
                [0x7fffffff]: 0, // IDLE
            },
        },
        options: mergedOptions,
    };
    return new Scheduler(state);
}
/**
 * 调度器类