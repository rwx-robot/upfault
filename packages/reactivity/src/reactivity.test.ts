import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  ref, 
  computed, 
  effect, 
  watch, 
  watchEffect,
  isRef,
  unref,
  toRef,
  toRefs,
  reactive,
  readonly,
  shallowRef,
  readonlyRef,
  shallowRef,
  triggerRef,
  customRef,
  toRaw,
  markRaw,
} from './index';

describe('UpFault Reactivity', () => {
  describe('ref', () => {
    it('should create a ref with initial value', () => {
      const r = ref(1);
      expect(r.value).toBe(1);
      expect(isRef(r)).toBe(true);
    });

    it('should track and trigger changes', () => {
      const r = ref(1);
      let dummy;
      effect(() => {
        dummy = r.value;
      });
      expect(dummy).toBe(1);
      
      r.value = 2;
      expect(dummy).toBe(2);
    });

    it('should work with objects', () => {
      const r = ref({ count: 1 });
      expect(r.value.count).toBe(1);
      
      r.value = { count: 2 };
      expect(r.value.count).toBe(2);
    });
  });

  describe('computed', () => {
    it('should compute derived value', () => {
      const r = ref(1);
      const c = computed(() => r.value * 2);
      
      expect(c.value).toBe(2);
      
      r.value = 2;
      expect(c.value).toBe(4);
    });

    it('should cache computed value', () => {
      const r = ref(1);
      const fn = vi.fn(() => r.value * 2);
      const c = computed(fn);
      
      expect(c.value).toBe(2);
      expect(c.value).toBe(2);
      expect(fn).toHaveBeenCalledTimes(1);
      
      r.value = 2;
      expect(c.value).toBe(4);
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should support setter', () => {
      const r = ref(1);
      const c = computed({
        get: () => r.value * 2,
        set: (val) => { r.value = val / 2; }
      });
      
      c.value = 4;
      expect(r.value).toBe(2);
    });
  });

  describe('effect', () => {
    it('should run immediately', () => {
      const fn = vi.fn();
      effect(fn);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should track dependencies', () => {
      const r = ref(1);
      let dummy;
      effect(() => {
        dummy = r.value;
      });
      expect(dummy).toBe(1);
      
      r.value = 2;
      expect(dummy).toBe(2);
    });

    it('should support lazy option', () => {
      const fn = vi.fn();
      const runner = effect(fn, { lazy: true });
      expect(fn).not.toHaveBeenCalled();
      runner();
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should support scheduler', () => {
      const r = ref(1);
      const scheduler = vi.fn((fn) => fn());
      effect(() => r.value, { scheduler });
      expect(scheduler).toHaveBeenCalledTimes(1);
      
      r.value = 2;
      expect(scheduler).toHaveBeenCalledTimes(2);
    });

    it('should support stop', () => {
      const r = ref(1);
      let dummy;
      const stop = effect(() => { dummy = r.value; });
      expect(dummy).toBe(1);
      
      stop();
      r.value = 2;
      expect(dummy).toBe(1);
    });
  });

  describe('watch', () => {
    it('should watch ref changes', () => {
      const r = ref(1);
      const cb = vi.fn();
      watch(r, cb);
      
      r.value = 2;
      expect(cb).toHaveBeenCalledWith(2, 1);
    });

    it('should support immediate option', () => {
      const r = ref(1);
      const cb = vi.fn();
      watch(r, cb, { immediate: true });
      expect(cb).toHaveBeenCalledWith(1, undefined);
    });

    it('should support deep option', () => {
      const r = ref({ count: 1 });
      const cb = vi.fn();
      watch(r, cb, { deep: true });
      
      r.value.count = 2;
      expect(cb).toHaveBeenCalledWith({ count: 2 }, { count: 1 });
    });

    it('should support cleanup', () => {
      const r = ref(1);
      const cleanup = vi.fn();
      const onCleanup = vi.fn((fn) => { cleanup(fn); });
      
      watch(r, (_, __, onCleanup) => {
        onCleanup(() => cleanup());
      });
      
      r.value = 2;
      expect(cleanup).toHaveBeenCalledTimes(1);
    });
  });

  describe('watchEffect', () => {
    it('should run immediately and track dependencies', () => {
      const r = ref(1);
      const fn = vi.fn();