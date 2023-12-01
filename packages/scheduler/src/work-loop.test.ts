import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  createScheduler, 
  Scheduler, 
  scheduleCallback, 
  cancelCallback, 
  flushSync, 
  getSchedulerStats,
  Priority,
  createSchedulerTask
} from './index';

describe('Scheduler Work Loop', () => {
  let scheduler: Scheduler;
  
  beforeEach(() => {
    vi.useFakeTimers();
    const now = performance.now();
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    scheduler = createScheduler({ timeSliceBudget: 5, useIdleCallback: false });
  });
  
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });
  
  // 辅助函数：手动触发调度器工作循环步骤
  async function runSchedulerSteps(scheduler: Scheduler, steps: number = 10) {
    for (let i = 0; i < steps; i++) {
      scheduler.__test_step();
    }
  }
  
  describe('基础调度', () => {
    it('应调度并执行任务', async () => {
      const callback = vi.fn();
      const task = createSchedulerTask(callback, 0); // IMMEDIATE 立即执行
      
      scheduler.scheduleCallback(task);
      
      // 逐步推进时间让调度器工作
      await runSchedulerSteps(scheduler, 5);
      
      expect(callback).toHaveBeenCalledTimes(1);
    });
    
    it('应按优先级执行 (IMMEDIATE 优先)', async () => {
      const normalFn = vi.fn();
      const immediateFn = vi.fn();
      
      // 使用 IMMEDIATE 优先级让任务立即进入任务队列
      scheduler.scheduleCallback(createSchedulerTask(normalFn, 0));   // IMMEDIATE
      scheduler.scheduleCallback(createSchedulerTask(immediateFn, 0));   // IMMEDIATE
      
      await runSchedulerSteps(scheduler, 5);
      
      // 两个 IMMEDIATE 任务都应执行
      expect(immediateFn).toHaveBeenCalled();
      expect(normalFn).toHaveBeenCalled();
    });
    
    it('应支持取消任务', async () => {
      const callback = vi.fn();
      const task = createSchedulerTask(callback, 5000);
      
      const taskId = scheduler.scheduleCallback(task);
      scheduler.cancelCallback(taskId);
      
      await runSchedulerSteps(scheduler, 5);
      
      expect(callback).not.toHaveBeenCalled();
    });
    
    it('flushSync 应立即执行 IMMEDIATE 任务', () => {
      const fn = vi.fn();
      const task = createSchedulerTask(fn, 0); // IMMEDIATE
      
      scheduler.scheduleCallback(task);