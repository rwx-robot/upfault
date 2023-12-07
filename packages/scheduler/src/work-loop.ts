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

import { 
  Priority, 
  SchedulerTask, 
  SchedulerOptions, 
  DEFAULT_SCHEDULER_OPTIONS,
  TaskQueue
} from '@upfault/shared';
import { PriorityQueue, createSchedulerTask, generateTaskId, SchedulerStats } from './queue';

// 重新导出类型
export type { SchedulerTask, SchedulerOptions, SchedulerStats, Priority, TaskQueue, DEFAULT_SCHEDULER_OPTIONS } from '@upfault/shared';
export { PriorityQueue, createSchedulerTask, generateTaskId } from './queue';

// ============================================================================
// 调度器核心状态
// ============================================================================

interface SchedulerState {
  taskQueue: PriorityQueue;
  timerQueue: PriorityQueue; // 延迟任务队列 (按 expirationTime 排序)
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
export function createScheduler(options: Partial<SchedulerOptions> = {}): Scheduler {
  const mergedOptions = { ...DEFAULT_SCHEDULER_OPTIONS, ...options };
  
  const state: SchedulerState = {
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
        [0]: 0,      // IMMEDIATE
        [250]: 0,    // USER_BLOCKING
        [5000]: 0,   // NORMAL
        [10000]: 0,  // LOW
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
  private state: SchedulerState;
  
  constructor(state: SchedulerState) {
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
  scheduleCallback(task: SchedulerTask): number {
    const { state } = this;
    
    // 统计
    state.stats.totalTasks++;
    state.stats.priorityDistribution[task.priority] = (state.stats.priorityDistribution[task.priority] || 0) + 1;
    
    // 如果任务已过期，立即加入任务队列
    if (task.expirationTime <= performance.now()) {
      state.taskQueue.push(task);
    } else {
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
  cancelCallback(taskId: number): boolean {
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
  flushSync(): void {
    const { state } = this;
    
    // 处理所有 IMMEDIATE 任务
    while (true) {
      const task = state.taskQueue.peek();
      if (!task || task.priority !== 0) break; // IMMEDIATE = 0
      
      this.executeTask(state.taskQueue.pop()!);
    }
  }
  
  /**
   * 获取调度器统计信息
   */
  getStats(): SchedulerStats {
    const { state } = this;
    return {
      ...state.stats,
      queueLength: state.taskQueue.size + state.timerQueue.size,
    };
  }
  
  /**
   * 获取当前选项
   */
  getOptions(): SchedulerOptions {
    return { ...this.state.options };
  }
  
  /**
   * 测试专用：手动触发一次工作循环迭代
   * 仅用于测试环境，配合 fake timers 使用
   */
  __test_step(currentTime?: number): void {