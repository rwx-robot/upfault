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

