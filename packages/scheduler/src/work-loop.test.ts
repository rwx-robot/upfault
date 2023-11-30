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
  