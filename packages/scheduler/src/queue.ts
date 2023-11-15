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
  private heap: SchedulerTask[] = [];
  private comparator: (a: SchedulerTask, b: SchedulerTask) => number;
  
  constructor(comparator?: (a: SchedulerTask, b: SchedulerTask) => number) {
    this.comparator = comparator || this.defaultCompare;
  }
  
  /**
   * 默认比较函数：优先级数值越小越靠前
   * 同优先级按过期时间排序，再按 ID 排序保证稳定性
   */
  private defaultCompare(a: SchedulerTask, b: SchedulerTask): number {
    if (a.priority !== b.priority) {
      return a.priority - b.priority;
    }
    if (a.expirationTime !== b.expirationTime) {
      return a.expirationTime - b.expirationTime;
    }
    return a.id - b.id;
  }
  
  /**
   * 入队 - O(log n)
   */
  push(task: SchedulerTask): void {
    this.heap.push(task);
    this.siftUp(this.heap.length - 1);
  }
  
  /**
   * 出队最高优先级任务 - O(log n)