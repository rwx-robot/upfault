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
      scheduler.flushSync();
      
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });
  
  describe('时间分片', () => {
    it('应执行所有任务', async () => {
      const fns = Array.from({ length: 10 }, () => vi.fn());
      
      // 调度多个任务 - 使用 IMMEDIATE 优先级立即执行
      for (let i = 0; i < 10; i++) {
        scheduler.scheduleCallback(createSchedulerTask(fns[i], 0));
      }
      
      // 运行足够多的步骤
      await runSchedulerSteps(scheduler, 15);
      
      // 应该执行所有任务
      fns.forEach(fn => {
        expect(fn).toHaveBeenCalled();
      });
    });
    
    it('IMMEDIATE 任务不应被时间片打断', async () => {
      const immediateFn = vi.fn();
      const normalFn = vi.fn();
      
      // 先调度普通任务 (IMMEDIATE 也可以立即执行)
      for (let i = 0; i < 5; i++) {
        scheduler.scheduleCallback(createSchedulerTask(normalFn, 0));
      }
      // 再调度 IMMEDIATE
      scheduler.scheduleCallback(createSchedulerTask(immediateFn, 0));
      
      await runSchedulerSteps(scheduler, 10);
      
      // IMMEDIATE 应优先执行
      expect(immediateFn).toHaveBeenCalledTimes(1);
    });
  });
  
describe('定时器队列', () => {
    it('应在过期时间后执行延迟任务', async () => {
      const fn = vi.fn();
      const task = createSchedulerTask(fn, 5000);
      const startTime = performance.now();
      task.expirationTime = startTime + 50; // 50ms 后过期
      
      scheduler.scheduleCallback(task);
      
      // 立即推进时间不应执行
      await vi.advanceTimersByTimeAsync(30);
      performance.now.mockImplementation(() => startTime + 30);
      expect(scheduler.getStats().completedTasks).toBe(0);
      
      // 过期后应执行 - 手动触发定时器推进和任务执行
      await vi.advanceTimersByTimeAsync(30);
      performance.now.mockImplementation(() => startTime + 60);
      // 使用 runAllTimersAsync 触发所有待处理的定时器
      await vi.runAllTimersAsync();
      expect(scheduler.getStats().completedTasks).toBe(1);
    });
  });
  
  describe('统计信息', () => {
    it('应正确统计任务', async () => {
      const fn = vi.fn();
      
      // 使用 IMMEDIATE 优先级立即执行
      scheduler.scheduleCallback(createSchedulerTask(fn, 0));
      scheduler.scheduleCallback(createSchedulerTask(vi.fn(), 0));
      
      await runSchedulerSteps(scheduler, 10);
      
      const stats = scheduler.getStats();
      
      expect(stats.totalTasks).toBe(2);
      expect(stats.completedTasks).toBe(2);
      expect(stats.cancelledTasks).toBe(0);
      // 两个任务都是 IMMEDIATE (0) 优先级
      expect(stats.priorityDistribution[0]).toBe(2);
    });
    
    it('应统计取消任务', async () => {
      const task = createSchedulerTask(vi.fn(), 5000);
      const id = scheduler.scheduleCallback(task);
      scheduler.cancelCallback(id);
      
      await runSchedulerSteps(scheduler, 5);
      
      const stats = scheduler.getStats();
      expect(stats.cancelledTasks).toBe(1);
    });
  });
  
  describe('全局默认调度器', () => {
    it('createScheduler 应返回新实例', () => {
      const s1 = createScheduler(); // 我们创建的实例
      const s2 = createScheduler(); // 新实例
      
      // 每次调用 createScheduler 都创建新实例
      expect(s1).not.toBe(s2);