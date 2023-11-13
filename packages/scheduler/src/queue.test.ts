import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PriorityQueue, createPriorityQueue, createSchedulerTask, generateTaskId, Priority } from './queue';

describe('PriorityQueue', () => {
  let queue: PriorityQueue;
  
  beforeEach(() => {
    queue = new PriorityQueue();
  });
  
  describe('基础操作', () => {
    it('应创建空队列', () => {
      expect(queue.isEmpty).toBe(true);
      expect(queue.size).toBe(0);
      expect(queue.peek()).toBeNull();
      expect(queue.pop()).toBeNull();
    });
    
    it('应入队和出队', () => {
      const task1 = createSchedulerTask(() => {}, 5000); // NORMAL
      const task2 = createSchedulerTask(() => {}, 250);  // USER_BLOCKING
      
      queue.push(task1);
      queue.push(task2);
      
      expect(queue.size).toBe(2);
      expect(queue.isEmpty).toBe(false);
    });
    
    it('应按优先级出队 (高优先级先出)', () => {
      const task1 = createSchedulerTask(() => {}, 5000); // NORMAL
      const task2 = createSchedulerTask(() => {}, 250);  // USER_BLOCKING
      const task3 = createSchedulerTask(() => {}, 0);    // IMMEDIATE
      
      queue.push(task1);
      queue.push(task2);
      queue.push(task3);
      
      // IMMEDIATE (0) 优先级最高，应先出
      expect(queue.pop()!.priority).toBe(0);
      expect(queue.pop()!.priority).toBe(250);
      expect(queue.pop()!.priority).toBe(5000);
    });
    
    it('同优先级按过期时间排序', () => {
      const now = performance.now();
      const task1 = createSchedulerTask(() => {}, 5000);
      task1.expirationTime = now + 1000;
      
      const task2 = createSchedulerTask(() => {}, 5000);
      task2.expirationTime = now + 500;
      
      queue.push(task1);
      queue.push(task2);
      
      // 过期时间早的先出
      expect(queue.pop()!.expirationTime).toBe(now + 500);
      expect(queue.pop()!.expirationTime).toBe(now + 1000);
    });
    
    it('同优先级同过期时间按 ID 排序 (稳定性)', () => {
      const task1 = createSchedulerTask(() => {}, 5000);
      const task2 = createSchedulerTask(() => {}, 5000);
      
      queue.push(task1);
      queue.push(task2);
      
      // ID 小的先出
      expect(queue.pop()!.id).toBeLessThan(queue.pop()!.id);
    });
  });
  
  describe('TaskQueue 接口', () => {
    it('hasHigherPriority 应正确判断', () => {
      const normalTask = createSchedulerTask(() => {}, 5000); // NORMAL
      const userBlockingTask = createSchedulerTask(() => {}, 250); // USER_BLOCKING
      
      queue.push(normalTask);
      
      expect(queue.hasHigherPriority(5000)).toBe(false); // 同优先级不算更高
      expect(queue.hasHigherPriority(250)).toBe(false);  // NORMAL(5000) 优先级低于 USER_BLOCKING(250)
      
      queue.push(userBlockingTask);
      expect(queue.hasHigherPriority(5000)).toBe(true);  // 有 USER_BLOCKING(250) < 5000
      expect(queue.hasHigherPriority(0)).toBe(false);    // 没有 IMMEDIATE(0)
    });
    
    it('remove 应正确移除任务', () => {
      const task = createSchedulerTask(() => {}, 5000);
      queue.push(task);
      
      expect(queue.remove(task)).toBe(true);
      expect(queue.size).toBe(0);
      expect(queue.remove(task)).toBe(false); // 已移除
    });
    
    it('clear 应清空队列', () => {
      queue.push(createSchedulerTask(() => {}, 5000));
      queue.push(createSchedulerTask(() => {}, 250));
      
      queue.clear();
      
      expect(queue.isEmpty).toBe(true);
      expect(queue.size).toBe(0);
    });
    
    it('toArray 应返回所有任务副本', () => {
      queue.push(createSchedulerTask(() => {}, 5000));
      queue.push(createSchedulerTask(() => {}, 250));
      
      const arr = queue.toArray();
      expect(arr).toHaveLength(2);
      
      // 修改副本不应影响原队列
      arr.length = 0;
      expect(queue.size).toBe(2);
    });
  });