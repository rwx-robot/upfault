/**
 * UpFault Scheduler - Priority Queue (Min Heap)
 *
 * 用于任务调度的优先队列，支持 O(log n) 入队/出队
 * 基于数组实现的最小堆
 */
import type { SchedulerTask, Priority, TaskQueue } from '@upfault/shared';
export { SchedulerStats } from '@upfault/shared';
/**