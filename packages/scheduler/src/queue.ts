/**
 * UpFault Scheduler - Priority Queue (Min Heap)
 * 
 * 用于任务调度的优先队列，支持 O(log n) 入队/出队
 * 基于数组实现的最小堆
 */

import type { SchedulerTask, Priority, TaskQueue, SchedulerStats } from '@upfault/shared';

export type { SchedulerStats } from '@upfault/shared';

/**
 * 优先队列实现 - 最小堆
 * 数值越小优先级越高 (IMMEDIATE=0 最高)
 */
export class PriorityQueue implements TaskQueue {