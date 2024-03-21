import { describe, it, expect } from 'vitest';
import {
  Priority,
  PriorityNames,
  priorityFromExpirationTime,
  computeExpirationTime,
  DEFAULT_SCHEDULER_OPTIONS,
  VNodeType,
} from './scheduler';

describe('Scheduler Types', () => {
  describe('Priority', () => {
    it('应定义正确的优先级值', () => {
      expect(Priority.IMMEDIATE).toBe(0);
      expect(Priority.USER_BLOCKING).toBe(250);
      expect(Priority.NORMAL).toBe(5_000);
      expect(Priority.LOW).toBe(10_000);
      expect(Priority.IDLE).toBe(0x7fffffff);
    });

    it('优先级应单调递增', () => {
      expect(Priority.IMMEDIATE).toBeLessThan(Priority.USER_BLOCKING);
      expect(Priority.USER_BLOCKING).toBeLessThan(Priority.NORMAL);
      expect(Priority.NORMAL).toBeLessThan(Priority.LOW);
      expect(Priority.LOW).toBeLessThan(Priority.IDLE);
    });
  });

  describe('PriorityNames', () => {
    it('应包含所有优先级的名称', () => {
      expect(PriorityNames[Priority.IMMEDIATE]).toBe('Immediate');
      expect(PriorityNames[Priority.USER_BLOCKING]).toBe('UserBlocking');
      expect(PriorityNames[Priority.NORMAL]).toBe('Normal');
      expect(PriorityNames[Priority.LOW]).toBe('Low');