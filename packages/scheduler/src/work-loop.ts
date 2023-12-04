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
