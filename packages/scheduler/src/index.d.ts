/**
 * @upfault/scheduler - UpFault 调度器
 *
 * Priority Queue + Time-sliced Work Loop
 * 版本: 0.2.0
 */
export { PriorityQueue, createPriorityQueue, generateTaskId, createSchedulerTask, } from './queue';
export { createScheduler, Scheduler, getDefaultScheduler, scheduleCallback, cancelCallback, flushSync, getSchedulerStats, } from './work-loop';
export { Priority, SchedulerTask, SchedulerOptions, DEFAULT_SCHEDULER_OPTIONS, SchedulerStats } from '@upfault/shared';
export declare const VERSION = "0.2.0";