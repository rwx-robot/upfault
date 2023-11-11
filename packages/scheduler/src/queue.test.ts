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