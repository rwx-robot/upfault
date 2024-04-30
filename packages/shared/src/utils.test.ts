import { describe, it, expect } from 'vitest';
import {
  isSameNode,
  isObject,
  isFunction,
  isString,
  isNumber,
  isPromise,
  isRef,
  isComputedRef,
  isReactive,
  isReadonly,
  isVNode,
  NOOP,
  IDENTITY,
  hasChanged,
  flatten,
  generateId,
  generateNumericId,
  deepClone,
  mergeObjects,
  unique,
  chunk,
  debounce,
  throttle,
  flattenTree,
  traverseTreeBFS,
  PerformanceTimer,
  LRUCache,
  assert,
} from './utils';

describe('Utils', () => {
  describe('isSameNode', () => {
    it('相同 type 和 key 应返回 true', () => {
      expect(isSameNode({ type: 'div', key: 'a' }, { type: 'div', key: 'a' })).toBe(true);
    });

    it('不同 type 应返回 false', () => {
      expect(isSameNode({ type: 'div', key: 'a' }, { type: 'span', key: 'a' })).toBe(false);
    });

    it('不同 key 应返回 false', () => {
      expect(isSameNode({ type: 'div', key: 'a' }, { type: 'div', key: 'b' })).toBe(false);
    });

    it('null key 应正确比较', () => {
      expect(isSameNode({ type: 'div', key: null }, { type: 'div', key: null })).toBe(true);
      expect(isSameNode({ type: 'div', key: 'a' }, { type: 'div', key: null })).toBe(false);
    });
  });

  describe('类型守卫', () => {
    describe('isObject', () => {
      it('对象应返回 true', () => {
        expect(isObject({})).toBe(true);
        expect(isObject({ a: 1 })).toBe(true);
      });

