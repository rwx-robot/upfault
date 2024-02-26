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
      expect(TrackOpTypes.ITERATE).toBe('iterate');
    });
  });

  describe('TriggerOpTypes', () => {
    it('应定义正确的触发操作类型', () => {
      expect(TriggerOpTypes.SET).toBe('set');
      expect(TriggerOpTypes.ADD).toBe('add');
      expect(TriggerOpTypes.DELETE).toBe('delete');
      expect(TriggerOpTypes.CLEAR).toBe('clear');
    });
  });

  describe('DEFAULT_REACTIVITY_OPTIONS', () => {
    it('应包含合理的默认值', () => {
      expect(DEFAULT_REACTIVITY_OPTIONS.debug).toBe(false);
      expect(DEFAULT_REACTIVITY_OPTIONS.computedCache).toBe('auto');
      expect(DEFAULT_REACTIVITY_OPTIONS.maxRecursionDepth).toBe(100);
      expect(typeof DEFAULT_REACTIVITY_OPTIONS.effectScheduler).toBe('function');
    });
  });

  describe('isRef', () => {
    it('Ref 对象应返回 true', () => {
      const ref = { value: 1, __v_isRef: true };
      expect(isRef(ref)).toBe(true);
    });

    it('普通对象应返回 false', () => {
      expect(isRef({ value: 1 })).toBe(false);
      expect(isRef(null)).toBe(false);
      expect(isRef(undefined)).toBe(false);
      expect(isRef(1)).toBe(false);
    });
  });

  describe('isComputedRef', () => {
    it('ComputedRef 对象应返回 true', () => {
      const computed = { value: 1, __v_isComputed: true, __v_isReadonly: true };
      expect(isComputedRef(computed)).toBe(true);
    });

    it('普通对象应返回 false', () => {
      expect(isComputedRef({ value: 1 })).toBe(false);
      expect(isComputedRef(null)).toBe(false);
    });
  });

  describe('isReactive', () => {
    it('响应式对象应返回 true', () => {
      const reactive = { a: 1, __v_isReactive: true, __v_raw: {} };
      expect(isReactive(reactive)).toBe(true);
    });

    it('普通对象应返回 false', () => {
      expect(isReactive({ a: 1 })).toBe(false);
      expect(isReactive(null)).toBe(false);
    });