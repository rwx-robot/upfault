/**
 * @upfault/scheduler - UpFault 调度器
 * 
 * Priority Queue + Time-sliced Work Loop
 * 版本: 0.2.0
 */

export {
  // Queue
  PriorityQueue,
  createPriorityQueue,
  generateTaskId,
  createSchedulerTask,
} from './queue';

export {
  // Work Loop
  createScheduler,
  Scheduler,
  getDefaultScheduler,
  scheduleCallback,
  cancelCallback,
  flushSync,
  getSchedulerStats,
} from './work-loop';

// Types (re-export from shared)
export type { Priority, SchedulerTask, SchedulerOptions, DEFAULT_SCHEDULER_OPTIONS, SchedulerStats } from '@upfault/shared';

// 版本信息
export const VERSION = '0.2.0';