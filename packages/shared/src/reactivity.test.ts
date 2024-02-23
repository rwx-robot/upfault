import { describe, it, expect } from 'vitest';
import {
  TrackOpTypes,
  TriggerOpTypes,
  DEFAULT_REACTIVITY_OPTIONS,
} from './reactivity';
import {
  isRef,
  isComputedRef,
  isReactive,
  isReadonly,
  hasChanged,
} from './utils';

describe('Reactivity Types', () => {
  describe('TrackOpTypes', () => {
    it('应定义正确的追踪操作类型', () => {
      expect(TrackOpTypes.GET).toBe('get');
      expect(TrackOpTypes.HAS).toBe('has');