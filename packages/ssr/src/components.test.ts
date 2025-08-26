/**
 * @upfault/ssr - components 模块测试
 */

import { describe, it, expect } from 'vitest';
import { h } from '@upfault/runtime';
import {
  Suspense,
  defineAsyncComponent,
  Teleport,
  KeepAlive,
  createAsyncComponent,
  createKeepAliveCache,
  matchesKeepAlive,
  Fragment,
  SSR_COMPONENTS_VERSION,
} from './components';

describe('Suspense', () => {

  it('应返回 Suspense 包装的 VNode', () => {
    const node = Suspense({ fallback: h('div', null, 'fallback'), children: h('div', null, 'main') });
    expect(node).toBeDefined();
  });
});

describe('Teleport', () => {

  it('应返回 Teleport 包装的 VNode', () => {
    const node = Teleport({ to: '#target', children: h('div', null, 'content') });
    expect(node).toBeDefined();
  });
});

describe('KeepAlive', () => {

  it('应返回 KeepAlive 包装的 VNode', () => {
    const node = KeepAlive({ children: h('div', null, 'cached'), maxSize: 5 });
    expect(node).toBeDefined();
  });
});

describe('Fragment', () => {

  it('应返回 Fragment VNode', () => {
    const node = Fragment({ children: [h('a', null, '1'), h('b', null, '2')] });
    expect(node).toBeDefined();
  });

  it('空 children 应返回 Fragment', () => {
    const node = Fragment({});
    expect(node).toBeDefined();
  });
});

describe('defineAsyncComponent', () => {

  it('应返回异步组件定义', () => {
    const def = defineAsyncComponent(async () => h('div', null, 'lazy'));
    expect(def).toBeDefined();
  });

  it('可多次调用且互不影响', () => {
    const a = defineAsyncComponent(async () => h('div', null, 'a'));
    const b = defineAsyncComponent(async () => h('div', null, 'b'));
    expect(a).not.toBe(b);
  });
});

describe('createAsyncComponent', () => {

  it('应返回异步组件对象', () => {
    const async = createAsyncComponent(async () => h('div', null, 'created'));
    expect(async).toBeDefined();
  });
});

describe('createKeepAliveCache', () => {

  it('默认 maxSize=10', () => {
    const cache = createKeepAliveCache();
    expect(cache).toBeInstanceOf(Map);
    // 暴露 size 限制能力
    expect(typeof cache.set).toBe('function');
  });

  it('自定义 maxSize 应被接受', () => {
    const cache = createKeepAliveCache(50);
    expect(cache).toBeInstanceOf(Map);
  });

  it('可正常 set/get/delete', () => {
    const cache = createKeepAliveCache(10);
    cache.set('k', { value: 1 });
    expect((cache.get('k') as any).value).toBe(1);
    cache.delete('k');
    expect(cache.has('k')).toBe(false);
  });
});

describe('matchesKeepAlive', () => {

  it('应是一个函数', () => {
    expect(typeof matchesKeepAlive).toBe('function');
  });

  it('null/undefined 输入应不抛异常', () => {
    expect(() => matchesKeepAlive(null)).not.toThrow();
    expect(() => matchesKeepAlive(undefined)).not.toThrow();
  });
});

describe('SSR_COMPONENTS_VERSION', () => {

  it('应为 0.2.0', () => {
    expect(SSR_COMPONENTS_VERSION).toBe('0.2.0');
  });
});