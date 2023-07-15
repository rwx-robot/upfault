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