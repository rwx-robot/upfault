/**
 * UpFault Scheduler - Priority Queue (Min Heap)
 *
 * 用于任务调度的优先队列，支持 O(log n) 入队/出队
 * 基于数组实现的最小堆
 */
import type { SchedulerTask, Priority, TaskQueue } from '@upfault/shared';
export { SchedulerStats } from '@upfault/shared';
/**
 * 优先队列实现 - 最小堆
 * 数值越小优先级越高 (IMMEDIATE=0 最高)
 */
export declare class PriorityQueue implements TaskQueue {
    private heap;
    private comparator;
    constructor(comparator?: (a: SchedulerTask, b: SchedulerTask) => number);
    /**
     * 默认比较函数：优先级数值越小越靠前
     * 同优先级按过期时间排序，再按 ID 排序保证稳定性
     */
    private defaultCompare;
    /**
     * 入队 - O(log n)
     */
    push(task: SchedulerTask): void;
    /**
     * 出队最高优先级任务 - O(log n)
     */
    pop(): SchedulerTask | null;
    /**
     * 查看最高优先级任务 - O(1)
     */
    peek(): SchedulerTask | null;
    /**
     * 检查是否有更高优先级任务
     */
    hasHigherPriority(priority: Priority): boolean;
