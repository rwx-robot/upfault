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