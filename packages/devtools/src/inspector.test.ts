/**
 * @upfault/devtools - Inspector 模块测试
 * 需要 jsdom 环境（highlightComponent 操作 DOM）
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createInspector } from '@upfault/devtools';
import type { ComponentInstance, VNode } from '@upfault/devtools';

// ── 辅助：构造 mock 实例 ───────────────────────────────────────────────────

function makeVNode(overrides: Partial<VNode> = {}): VNode {
  return {
    // 新模型契约：vnode.type 为 VNodeType 枚举，真实标签/组件存入 tag
    type: 2 as any,
    tag: 'div',
    key: null,
    props: null,
    children: null,
    el: null,
    componentInstance: null,
    shapeFlag: 1,
    patchFlag: 0,
    ...overrides,
  };
}

function makeInstance(overrides: Partial<ComponentInstance> = {}): ComponentInstance {
  return {
    uid: 1,
    type: 'div',
    vnode: makeVNode(),
    parent: null,
    root: null,
    proxy: {},
    provides: {},
    inject: {},
    props: {},
    isMounted: false,
    isUnmounted: false,
    isDeactivated: false,
    render: null,
    update: null,
    effects: [],
    onBeforeMount: [],
    onMounted: [],
    onBeforeUpdate: [],
    onUpdated: [],
    onBeforeUnmount: [],
    onUnmounted: [],
    onActivated: [],
    onDeactivated: [],
    onErrorCaptured: [],
    onRenderTracked: [],
    onRenderTriggered: [],
    subTree: null,
    subTreeAnchor: null,
    children: [],
    ...overrides,
  };
}

// ── 辅助：mock DOM ────────────────────────────────────────────────────────

function mockBoundingClientRect(left: number, top: number, width: number, height: number) {
  Element.prototype.getBoundingClientRect = vi.fn().mockReturnValue({
    left, top, width, height,
    right: left + width, bottom: top + height,
    x: left, y: top,
    toJSON: () => ({}),
  });
}

// ── 辅助：清除 highlight overlay ────────────────────────────────────────

function removeAllOverlays() {
  document.querySelectorAll('[data-upfault-highlight]').forEach(el => el.remove());
}

describe('Inspector', () => {
  let inspector: ReturnType<typeof createInspector>;

  beforeEach(() => {
    inspector = createInspector();
    document.body.innerHTML = '';
    removeAllOverlays();
    Element.prototype.getBoundingClientRect = vi.fn();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    removeAllOverlays();
  });

  // ── createInspector ────────────────────────────────────────────────────────

  it('应返回一个包含 6 个方法的 Inspector', () => {
    expect(typeof inspector.inspectComponent).toBe('function');
    expect(typeof inspector.inspectVNode).toBe('function');
    expect(typeof inspector.getComponentTree).toBe('function');
    expect(typeof inspector.findComponentByName).toBe('function');
    expect(typeof inspector.findComponentByUid).toBe('function');
    expect(typeof inspector.highlightComponent).toBe('function');
    expect(typeof inspector.unhighlightComponent).toBe('function');
  });

  // ── inspectVNode ───────────────────────────────────────────────────────────

  it('应返回 VNodeInfo', () => {
    const vnode = makeVNode({ tag: 'span', key: 'a', patchFlag: 1 });
    const info = inspector.inspectVNode(vnode);
    expect(info.type).toBe('span');
    expect(info.key).toBe('a');
    expect(info.patchFlag).toBe(1);
  });

  it('null vnode 应返回 null', () => {
    expect(inspector.inspectVNode(null as any)).toBeNull();
  });

  it('props 为 null 时返回 null', () => {
    const info = inspector.inspectVNode(makeVNode({ props: null }));
    expect(info.props).toBeNull();
  });

  it('children 为数组时应递归映射', () => {
    const child = makeVNode({ tag: 'span' });
    const parent = makeVNode({ children: [child] });
    const info = inspector.inspectVNode(parent);
    expect(Array.isArray(info.children)).toBe(true);
    expect((info.children as any[])).toHaveLength(1);
    expect((info.children as any[])[0].type).toBe('span');
  });

  it('children 为字符串时应直接返回字符串', () => {
    const vnode = makeVNode({ children: 'hello' });
    const info = inspector.inspectVNode(vnode);
    expect(info.children).toBe('hello');
  });

  it('shapeFlag 应透传', () => {
    const vnode = makeVNode({ shapeFlag: 17 });
    expect(inspector.inspectVNode(vnode).shapeFlag).toBe(17);
  });

  it('el 应透传引用', () => {
    const el = document.createElement('div');
    const vnode = makeVNode({ el });
    expect(inspector.inspectVNode(vnode).el).toBe(el);
  });

  it('componentInstance 应透传', () => {
    const childInst = makeInstance({ uid: 99 });
    const vnode = makeVNode({ componentInstance: childInst });
    expect(inspector.inspectVNode(vnode).componentInstance).toBe(childInst);
  });

  // ── inspectComponent ───────────────────────────────────────────────────────

  it('应返回 ComponentInfo 且包含基本字段', () => {
    const instance = makeInstance({
      uid: 5,
      type: 'Counter',
      props: { count: 0 },
      isMounted: true,
    });
    const info = inspector.inspectComponent(instance);
    expect(info.uid).toBe(5);
    expect(info.type).toBe('Counter');
    expect(info.props).toEqual({ count: 0 });
    expect(info.isMounted).toBe(true);
  });

  it('name 应从 type 推导（函数名）', () => {
    const instance = makeInstance({ type: 'MyComponent' as any });
    expect(inspector.inspectComponent(instance).name).toBe('MyComponent');
  });

  it('name 应从 type.displayName 优先', () => {
    const instance = makeInstance({ type: { displayName: 'Override', name: 'Actual' } });
    expect(inspector.inspectComponent(instance).name).toBe('Override');
  });

  it('无 children 时 children 数组为空', () => {
    const instance = makeInstance({ children: undefined });
    expect(inspector.inspectComponent(instance).children).toEqual([]);
  });

  it('有 children 时应递归映射', () => {
    const child = makeInstance({ uid: 2 });
    const parent = makeInstance({ uid: 1, children: [child] });
    const info = inspector.inspectComponent(parent);
    expect(info.children).toHaveLength(1);
    expect(info.children[0].uid).toBe(2);
  });

  it('有 parent 时 parent 字段被填充', () => {
    const child = makeInstance({ uid: 2 });
    const parent = makeInstance({ uid: 1 });
    child.parent = parent;
    const info = inspector.inspectComponent(child);
    expect(info.parent).toBeDefined();
    expect(info.parent!.uid).toBe(1);
  });

  it('无 parent 时 parent 字段为 undefined', () => {
    const instance = makeInstance({ parent: null });
    expect(inspector.inspectComponent(instance).parent).toBeUndefined();
  });

  it('vnode 字段应被填充为 VNodeInfo', () => {
    const instance = makeInstance({ vnode: makeVNode({ tag: 'Article' }) });
    const info = inspector.inspectComponent(instance);
    expect(info.vnode.type).toBe('Article');
  });

  it('state 字段应返回对象', () => {
    const instance = makeInstance({ proxy: {} });
    const info = inspector.inspectComponent(instance);
    expect(typeof info.state).toBe('object');
  });

  it('refs/computed/effects/lifecycle 字段应存在', () => {
    const info = inspector.inspectComponent(makeInstance());
    // refs/computed 是 Record<string, any>（按 key 索引的对象）
    expect(typeof info.refs).toBe('object');
    expect(typeof info.computed).toBe('object');
    // effects 是 any[]（effects 列表）
    expect(Array.isArray(info.effects)).toBe(true);
    // lifecycle 是对象
    expect(typeof info.lifecycle).toBe('object');
  });

  // ── getComponentTree ───────────────────────────────────────────────────────

  it('应返回根组件的 ComponentInfo', () => {
    const root = makeInstance({ uid: 1 });
    const tree = inspector.getComponentTree(root);
    expect(tree.uid).toBe(1);
  });

  it('应包含完整子树', () => {
    const child = makeInstance({ uid: 2 });
    const root = makeInstance({ uid: 1, children: [child] });
    const tree = inspector.getComponentTree(root);
    expect(tree.children[0].uid).toBe(2);
  });

  // ── findComponentByName ────────────────────────────────────────────────────

  it('能找到目标名称的组件', () => {
    const target = makeInstance({ uid: 3, type: 'Article' as any });
    const root = makeInstance({ uid: 1, children: [target] });
    const found = inspector.findComponentByName(root, 'Article');
    expect(found?.uid).toBe(3);
  });

  it('找不到时返回 null', () => {
    const root = makeInstance({ uid: 1 });
    expect(inspector.findComponentByName(root, 'NoSuch')).toBeNull();
  });

  it('跨层级搜索应找到最深匹配', () => {
    const target = makeInstance({ uid: 5, type: 'Deep' as any });
    const mid = makeInstance({ uid: 4, children: [target] });
    const root = makeInstance({ uid: 1, children: [mid] });
    expect(inspector.findComponentByName(root, 'Deep')?.uid).toBe(5);
  });

  it('同名优先返回最顶层匹配（树前序）', () => {
    const one = makeInstance({ uid: 2, type: 'Dup' as any });
    const two = makeInstance({ uid: 3, type: 'Dup' as any });
    const root = makeInstance({ uid: 1, children: [one, two] });
    expect(inspector.findComponentByName(root, 'Dup')?.uid).toBe(2);
  });

  // ── findComponentByUid ────────────────────────────────────────────────────

  it('能找到目标 uid 的组件', () => {
    const target = makeInstance({ uid: 7 });
    const root = makeInstance({ uid: 1, children: [target] });
    expect(inspector.findComponentByUid(root, 7)?.uid).toBe(7);
  });

  it('找不到时返回 null', () => {
    const root = makeInstance({ uid: 1 });
    expect(inspector.findComponentByUid(root, 99)).toBeNull();
  });

  it('跨层级搜索应工作', () => {
    const target = makeInstance({ uid: 10 });
    const mid = makeInstance({ uid: 9, children: [target] });
    const root = makeInstance({ uid: 1, children: [mid] });
    expect(inspector.findComponentByUid(root, 10)?.uid).toBe(10);
  });

  // ── highlightComponent / unhighlightComponent ───────────────────────────────

  it('highlightComponent 应追加 overlay 到 body', () => {
    document.body.innerHTML = '<div id="target" style="width:100px;height:50px"></div>';
    const target = document.getElementById('target')!;
    mockBoundingClientRect(10, 20, 100, 50);

    inspector.highlightComponent(target);

    const overlay = document.querySelector('[data-upfault-highlight]');
    expect(overlay).not.toBeNull();
    expect(overlay!.parentElement).toBe(document.body);
  });

  it('overlay 应覆盖目标元素位置', () => {
    document.body.innerHTML = '<div id="target" style="width:100px;height:50px"></div>';
    const target = document.getElementById('target')!;
    mockBoundingClientRect(10, 20, 100, 50);

    inspector.highlightComponent(target);

    const overlay = document.querySelector('[data-upfault-highlight]') as HTMLElement;
    expect(overlay.style.top).toBe('20px');
    expect(overlay.style.left).toBe('10px');
    expect(overlay.style.width).toBe('100px');
    expect(overlay.style.height).toBe('50px');
  });

  it('overlay 应设置正确的 z-index', () => {
    document.body.innerHTML = '<div id="target" style="width:10px;height:10px"></div>';
    mockBoundingClientRect(0, 0, 10, 10);
    inspector.highlightComponent(document.getElementById('target')!);
    const overlay = document.querySelector('[data-upfault-highlight]') as HTMLElement;
    expect(overlay.style.zIndex).toBe('2147483647');
  });

  it('多次 highlightComponent 应只保留一个 overlay', () => {
    document.body.innerHTML = '<div id="a" style="width:10px;height:10px"></div><div id="b" style="width:10px;height:10px"></div>';
    mockBoundingClientRect(0, 0, 10, 10);
    inspector.highlightComponent(document.getElementById('a')!);
    inspector.highlightComponent(document.getElementById('b')!);
    expect(document.querySelectorAll('[data-upfault-highlight]')).toHaveLength(1);
  });

  it('unhighlightComponent 应移除 overlay', () => {
    document.body.innerHTML = '<div id="target" style="width:10px;height:10px"></div>';
    mockBoundingClientRect(0, 0, 10, 10);
    inspector.highlightComponent(document.getElementById('target')!);
    inspector.unhighlightComponent();
    expect(document.querySelector('[data-upfault-highlight]')).toBeNull();
  });

  it('unhighlightComponent 无 overlay 时应不报错', () => {
    expect(() => inspector.unhighlightComponent()).not.toThrow();
  });

  it('highlightComponent 设置 box-sizing: border-box', () => {
    document.body.innerHTML = '<div id="target" style="width:10px;height:10px"></div>';
    mockBoundingClientRect(0, 0, 10, 10);
    inspector.highlightComponent(document.getElementById('target')!);
    const overlay = document.querySelector('[data-upfault-highlight]') as HTMLElement;
    expect(overlay.style.boxSizing).toBe('border-box');
  });

  // ── 边界条件 ─────────────────────────────────────────────────────────────

  it('两个 inspector 实例应有独立的 highlight 状态', () => {
    const inspector2 = createInspector();
    document.body.innerHTML = '<div id="a" style="width:10px;height:10px"></div><div id="b" style="width:10px;height:10px"></div>';
    mockBoundingClientRect(0, 0, 10, 10);

    inspector.highlightComponent(document.getElementById('a')!);
    inspector2.highlightComponent(document.getElementById('b')!);

    // 两个 overlay 都存在（各自独立）
    expect(document.querySelectorAll('[data-upfault-highlight]')).toHaveLength(2);
  });
});
