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