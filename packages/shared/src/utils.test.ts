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

      it('null、数组、原始值应返回 false', () => {
        expect(isObject(null)).toBe(false);
        expect(isObject([])).toBe(false);
        expect(isObject(1)).toBe(false);
        expect(isObject('str')).toBe(false);
        expect(isObject(undefined)).toBe(false);
      });
    });

    describe('isFunction', () => {
      it('函数应返回 true', () => {
        expect(isFunction(() => {})).toBe(true);
        expect(isFunction(function() {})).toBe(true);
        expect(isFunction(class {})).toBe(true);
      });

      it('非函数应返回 false', () => {
        expect(isFunction({})).toBe(false);
        expect(isFunction(null)).toBe(false);
        expect(isFunction('str')).toBe(false);
      });
    });

    describe('isString', () => {
      it('字符串应返回 true', () => {
        expect(isString('hello')).toBe(true);
        expect(isString('')).toBe(true);
      });

      it('非字符串应返回 false', () => {
        expect(isString(1)).toBe(false);
        expect(isString(null)).toBe(false);
      });
    });

    describe('isNumber', () => {
      it('数字应返回 true', () => {
        expect(isNumber(1)).toBe(true);
        expect(isNumber(0)).toBe(true);
        expect(isNumber(-1)).toBe(true);
        expect(isNumber(1.5)).toBe(true);
      });

      it('NaN 应返回 false', () => {
        expect(isNumber(NaN)).toBe(false);
      });

      it('非数字应返回 false', () => {
        expect(isNumber('1')).toBe(false);
        expect(isNumber(null)).toBe(false);
      });
    });

    describe('isPromise', () => {
      it('Promise 应返回 true', () => {
        expect(isPromise(Promise.resolve())).toBe(true);
        expect(isPromise(new Promise(() => {}))).toBe(true);
        expect(isPromise({ then: () => {} })).toBe(true); // thenable
      });

      it('非 Promise 应返回 false', () => {
        expect(isPromise({})).toBe(false);
        expect(isPromise(null)).toBe(false);
        expect(isPromise(1)).toBe(false);
      });
    });

    describe('isRef / isComputedRef / isReactive / isReadonly / isVNode', () => {
      it('应正确识别标记对象', () => {
        expect(isRef({ __v_isRef: true })).toBe(true);
        expect(isComputedRef({ __v_isComputed: true })).toBe(true);
        expect(isReactive({ __v_isReactive: true })).toBe(true);
        expect(isReadonly({ __v_isReadonly: true })).toBe(true);
        expect(isVNode({ __v_isVNode: true })).toBe(true);
      });

      it('未标记对象应返回 false', () => {
        expect(isRef({})).toBe(false);
        expect(isComputedRef({})).toBe(false);
        expect(isReactive({})).toBe(false);
        expect(isReadonly({})).toBe(false);
        expect(isVNode({})).toBe(false);
      });
    });
  });

  describe('NOOP / IDENTITY', () => {
    it('NOOP 应不抛出错误', () => {
      expect(() => NOOP()).not.toThrow();
    });

    it('IDENTITY 应返回原值', () => {
      expect(IDENTITY(1)).toBe(1);
      expect(IDENTITY('test')).toBe('test');
      expect(IDENTITY({ a: 1 })).toEqual({ a: 1 });
    });
  });

  describe('hasChanged', () => {
    it('不同值返回 true', () => {
      expect(hasChanged(1, 2)).toBe(true);
      expect(hasChanged('a', 'b')).toBe(true);
      expect(hasChanged({}, {})).toBe(true); // 不同引用
    });

    it('相同值返回 false', () => {
      expect(hasChanged(1, 1)).toBe(false);
      expect(hasChanged('a', 'a')).toBe(false);
      const obj = {};
      expect(hasChanged(obj, obj)).toBe(false); // 同引用
    });

    it('NaN 视为相同', () => {
      expect(hasChanged(NaN, NaN)).toBe(false);
    });
  });

  describe('flatten', () => {
    it('应扁平化嵌套数组', () => {
      expect(flatten([1, [2, 3], 4])).toEqual([1, 2, 3, 4]);
      expect(flatten([[1, 2], [3, 4]])).toEqual([1, 2, 3, 4]);
      expect(flatten([1, 2, 3])).toEqual([1, 2, 3]);
      expect(flatten([])).toEqual([]);
    });
  });

  describe('generateId', () => {
    it('应生成唯一字符串', () => {
      const id1 = generateId('test');
      const id2 = generateId('test');
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^test\d+_/);
    });
  });

  describe('generateNumericId', () => {
    it('应生成单调递增数字', () => {
      const id1 = generateNumericId();
      const id2 = generateNumericId();
      expect(id2).toBe(id1 + 1);
    });
  });

  describe('deepClone', () => {
    it('应深度克隆对象', () => {
      const original = { a: 1, b: { c: 2 }, d: [3, 4] };
      const cloned = deepClone(original);
      
      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original);
      expect(cloned.b).not.toBe(original.b);
      expect(cloned.d).not.toBe(original.d);
    });

    it('应处理基本类型', () => {
      expect(deepClone(1)).toBe(1);
      expect(deepClone('str')).toBe('str');
      expect(deepClone(null)).toBe(null);
    });
  });

  describe('mergeObjects', () => {
    it('应合并对象', () => {
      const target = { a: 1, b: 2 };
      const source = { b: 3, c: 4 };
      const result = mergeObjects(target, source);
      
      expect(result).toEqual({ a: 1, b: 3, c: 4 });
      expect(target).toEqual({ a: 1, b: 2 }); // 不修改原对象
    });
  });

  describe('unique', () => {
    it('应去重并保持顺序', () => {
      expect(unique([1, 2, 2, 3, 1, 4])).toEqual([1, 2, 3, 4]);
      expect(unique(['a', 'b', 'a', 'c'])).toEqual(['a', 'b', 'c']);
    });
  });