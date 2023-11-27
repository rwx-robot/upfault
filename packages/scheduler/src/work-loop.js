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
 */
export class Scheduler {
    constructor(state) {
        this.state = state;
    }
    // ============================================================================
    // 公共 API
    // ============================================================================
    /**
     * 调度任务 - 主入口
     * @param task 调度任务
     * @returns 任务 ID (用于取消)
     */
    scheduleCallback(task) {
        const { state } = this;
        // 统计
        state.stats.totalTasks++;
        state.stats.priorityDistribution[task.priority] = (state.stats.priorityDistribution[task.priority] || 0) + 1;
        // 如果任务已过期，立即加入任务队列
        if (task.expirationTime <= performance.now()) {
            state.taskQueue.push(task);
        }
        else {
            // 否则加入定时器队列
            state.timerQueue.push(task);
        }
        // 请求调度
        this.requestHostCallback();
        return task.id;
    }
    /**
     * 取消任务
     */
    cancelCallback(taskId) {
        const { state } = this;
        // 先尝试从任务队列移除
        const tasks = state.taskQueue.toArray();
        const task = tasks.find(t => t.id === taskId);
        if (task) {
            task.cancelled = true;
            state.taskQueue.remove(task);
            state.stats.cancelledTasks++;
            return true;
        }
        // 再尝试从定时器队列移除
        const timerTasks = state.timerQueue.toArray();
        const timerTask = timerTasks.find(t => t.id === taskId);
        if (timerTask) {
            timerTask.cancelled = true;
            state.timerQueue.remove(timerTask);
            state.stats.cancelledTasks++;
            return true;
        }
        return false;
    }
    /**
     * 刷新所有同步任务 (IMMEDIATE 优先级)
     */
    flushSync() {
        const { state } = this;
        // 处理所有 IMMEDIATE 任务
        while (true) {
            const task = state.taskQueue.peek();
            if (!task || task.priority !== 0)
                break; // IMMEDIATE = 0
            this.executeTask(state.taskQueue.pop());
        }
    }
    /**
     * 获取调度器统计信息
     */
    getStats() {
        const { state } = this;
        return {
            ...state.stats,
            queueLength: state.taskQueue.size + state.timerQueue.size,
        };
    }
    /**
     * 获取当前选项
     */
    getOptions() {
        return { ...this.state.options };
    }
    /**
     * 测试专用：手动触发一次工作循环迭代
     * 仅用于测试环境，配合 fake timers 使用
     */
    __test_step(currentTime) {
        const { state } = this;
        // 处理到期的定时器任务
        this.advanceTimers(currentTime);
        // 执行一个工作循环迭代
        if (state.taskQueue.size > 0) {
            const task = state.taskQueue.peek();
            // 检查是否应让出 (IMMEDIATE 不让出)
            if (!this.shouldYield() || task.priority === 0) {
                const currentTask = state.taskQueue.pop();
                this.executeTask(currentTask);
            }
        }
    }
    // ============================================================================
    // 内部方法
    // ============================================================================
    /**
     * 请求宿主回调 (requestIdleCallback / setTimeout 兜底)
     */
    requestHostCallback() {
        const { state } = this;
        if (state.isHostCallbackScheduled)
            return;
        state.isHostCallbackScheduled = true;
        if (typeof requestIdleCallback !== 'undefined' && state.options.useIdleCallback) {
            state.hostCallbackId = requestIdleCallback(this.workLoop.bind(this), {
                timeout: state.options.timeSliceBudget * 2,
            });
        }
        else {
            // 兜底：setTimeout 模拟 - 直接使用全局 setTimeout (配合 fake timers)
            state.hostCallbackId = setTimeout(() => {
                this.workLoop({ timeRemaining: () => state.options.timeSliceBudget, didTimeout: false });
            }, 0);
        }
    }
    /**
     * 取消宿主回调
     */
    cancelHostCallback() {
        const { state } = this;
        if (state.hostCallbackId !== null) {
            if (typeof cancelIdleCallback !== 'undefined') {
                cancelIdleCallback(state.hostCallbackId);
            }
            else {
                clearTimeout(state.hostCallbackId);
            }
            state.hostCallbackId = null;
            state.isHostCallbackScheduled = false;
        }
    }
    /**
     * 工作循环核心 - 处理任务直到时间片用完
     */
    workLoop(deadline) {
        const { state } = this;
        state.isHostCallbackScheduled = false;
        state.isPerformingWork = true;
        try {
            // 先处理到期的定时器任务
            this.advanceTimers();
            // 设置截止时间
            state.deadline = typeof deadline.timeRemaining === 'function'
                ? performance.now() + deadline.timeRemaining()
                : deadline.didTimeout ? performance.now() : performance.now() + state.options.timeSliceBudget;
            // 主工作循环
            while (state.taskQueue.size > 0) {
                const task = state.taskQueue.peek();
                // 检查是否应让出
                if (this.shouldYield() && task.priority > 0) { // IMMEDIATE 不让出
                    break;
                }
                // 执行任务
                const currentTask = state.taskQueue.pop();
                this.executeTask(currentTask);
            }
            // 如果还有任务，继续调度
            if (state.taskQueue.size > 0 || state.timerQueue.size > 0) {
                this.requestHostCallback();
            }
        }
        finally {
            state.isPerformingWork = false;
        }
    }
    /**
     * 推进定时器：将到期的任务从 timerQueue 移到 taskQueue
     * @param currentTime 可选的当前时间 (用于测试，默认使用 performance.now())
     */
    advanceTimers(currentTime) {
        const { state } = this;
        const now = currentTime !== undefined ? currentTime : performance.now();
        while (state.timerQueue.size > 0) {
            const timerTask = state.timerQueue.peek();
            if (timerTask.expirationTime > now)
                break;
            state.timerQueue.pop();
            // 任务未取消，加入任务队列
            if (!timerTask.cancelled) {
                state.taskQueue.push(timerTask);
            }
        }
    }
    /**
     * 判断是否应让出主线程
     */
    shouldYield() {
        const { state } = this;
        if (state.options.useIdleCallback && typeof performance !== 'undefined') {