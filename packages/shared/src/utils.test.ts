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

  describe('chunk', () => {
    it('应按大小分块', () => {
      expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
      expect(chunk([1, 2, 3], 3)).toEqual([[1, 2, 3]]);
      expect(chunk([], 2)).toEqual([]);
    });
  });

  describe('debounce', () => {
    it('应在延迟后执行', async () => {
      let count = 0;
      const fn = debounce(() => count++, 50);
      
      fn();
      fn();
      fn();
      expect(count).toBe(0);
      
      await new Promise(r => setTimeout(r, 60));
      expect(count).toBe(1);
    });
  });

  describe('throttle', () => {
    it('应限制执行频率', async () => {
      let count = 0;
      const fn = throttle(() => count++, 50);
      
      fn();
      fn();
      fn();
      expect(count).toBe(1);
      
      await new Promise(r => setTimeout(r, 60));
      fn();
      expect(count).toBe(2);
    });
  });

  describe('flattenTree', () => {
    it('应深度优先扁平化树', () => {
      const tree = [
        { id: 1, children: [{ id: 2 }, { id: 3, children: [{ id: 4 }] }] },
        { id: 5 },
      ];
      
      const result = flattenTree(tree, n => n.children);
      expect(result.map(n => n.id)).toEqual([1, 2, 3, 4, 5]);
    });
  });

  describe('traverseTreeBFS', () => {
    it('应广度优先遍历树', () => {
      const tree = { id: 1, children: [{ id: 2 }, { id: 3, children: [{ id: 4 }] }] };
      const visited: number[] = [];
      
      traverseTreeBFS(tree, n => n.children, (n, depth) => {
        visited.push(n.id);
        expect(depth).toBeDefined();
      });
      
      expect(visited).toEqual([1, 2, 3, 4]);
    });

    it('visitor 返回 false 应停止遍历', () => {
      const tree = { id: 1, children: [{ id: 2 }, { id: 3 }] };
      const visited: number[] = [];
      
      traverseTreeBFS(tree, n => n.children, n => {
        visited.push(n.id);
        return n.id !== 2; // 遇到 2 停止
      });
      
      expect(visited).toEqual([1, 2]);
    });
  });

  describe('PerformanceTimer', () => {
    it('应正确计时', () => {
      const timer = new PerformanceTimer();
      timer.start();
      
      // 等待一小段时间 - 使用 setTimeout 更可靠
      const start = Date.now();
      while (Date.now() - start < 20) {}
      
      const elapsed = timer.stop();
      expect(elapsed).toBeGreaterThanOrEqual(15);
      expect(elapsed).toBeLessThan(100); // 允许误差
    });

    it('reset 应重置状态', () => {
      const timer = new PerformanceTimer();
      timer.start();
      timer.reset();
      
      expect(timer.elapsed).toBe(0);
    });
  });

  describe('LRUCache', () => {
    it('应存储和获取值', () => {
      const cache = new LRUCache<string, number>(3);
      
      cache.set('a', 1);
      cache.set('b', 2);
      
      expect(cache.get('a')).toBe(1);
      expect(cache.get('b')).toBe(2);
      expect(cache.get('c')).toBeUndefined();
    });

    it('应淘汰最久未使用', () => {
      const cache = new LRUCache<string, number>(2);
      
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3); // 'a' 被淘汰
      
      expect(cache.get('a')).toBeUndefined();
      expect(cache.get('b')).toBe(2);
      expect(cache.get('c')).toBe(3);
    });

    it('获取值应更新为最近使用', () => {
      const cache = new LRUCache<string, number>(2);
      
      cache.set('a', 1);
      cache.set('b', 2);
      cache.get('a'); // 'a' 变为最近使用
      cache.set('c', 3); // 'b' 被淘汰
      
      expect(cache.get('a')).toBe(1);
      expect(cache.get('b')).toBeUndefined();
      expect(cache.get('c')).toBe(3);
    });
  });

  describe('assert', () => {
    it('真值不抛出', () => {
      expect(() => assert(true)).not.toThrow();
      expect(() => assert(1)).not.toThrow();
      expect(() => assert('non-empty')).not.toThrow();
    });
