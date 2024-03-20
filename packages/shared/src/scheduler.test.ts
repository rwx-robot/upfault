import { describe, it, expect } from 'vitest';
import {
  Priority,
  PriorityNames,
  priorityFromExpirationTime,
  computeExpirationTime,
  DEFAULT_SCHEDULER_OPTIONS,
  VNodeType,