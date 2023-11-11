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