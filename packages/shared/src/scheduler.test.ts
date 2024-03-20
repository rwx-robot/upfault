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