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
      expect(PriorityNames[Priority.IDLE]).toBe('Idle');
    });
  });

  describe('priorityFromExpirationTime', () => {
    const now = performance.now();

    it('已过期应返回 IMMEDIATE', () => {
      expect(priorityFromExpirationTime(now - 100)).toBe(Priority.IMMEDIATE);
      expect(priorityFromExpirationTime(now)).toBe(Priority.IMMEDIATE);
    });

    it('250ms 内应返回 USER_BLOCKING', () => {
      expect(priorityFromExpirationTime(now + 100)).toBe(Priority.USER_BLOCKING);
      expect(priorityFromExpirationTime(now + 250)).toBe(Priority.USER_BLOCKING);
    });

    it('5s 内应返回 NORMAL', () => {
      expect(priorityFromExpirationTime(now + 1_000)).toBe(Priority.NORMAL);
      expect(priorityFromExpirationTime(now + 5_000)).toBe(Priority.NORMAL);
    });

    it('10s 内应返回 LOW', () => {
      expect(priorityFromExpirationTime(now + 6_000)).toBe(Priority.LOW);
      expect(priorityFromExpirationTime(now + 10_000)).toBe(Priority.LOW);
    });

    it('10s 以上应返回 IDLE', () => {
      expect(priorityFromExpirationTime(now + 11_000)).toBe(Priority.IDLE);
    });
  });

  describe('computeExpirationTime', () => {
    it('IMMEDIATE 应返回当前时间', () => {
      const before = performance.now();
      const exp = computeExpirationTime(Priority.IMMEDIATE);
      const after = performance.now();
      expect(exp).toBeGreaterThanOrEqual(before);
      expect(exp).toBeLessThanOrEqual(after + 10);
    });

    it('USER_BLOCKING 应返回 now + 250', () => {
      const before = performance.now();
      const exp = computeExpirationTime(Priority.USER_BLOCKING);
      const after = performance.now();
      expect(exp).toBeGreaterThanOrEqual(before + 240);