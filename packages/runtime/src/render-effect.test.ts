/**
 * @upfault/runtime - 渲染 effect / 响应式更新测试
 *
 * 覆盖 M5 暴露的缺陷：render 必须在依赖追踪上下文中执行，否则
 * effect 收集不到 render 内读取的 ref，响应式更新永不触发。
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { h, ref, createRenderer, defaultRendererOptions } from '@upfault/runtime';

const flush = async () => {
  // 渲染任务走 queueMicrotask，多让出几次确保 flush 完成
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};

describe('@upfault/runtime 渲染 effect（响应式更新）', () => {
  let container: HTMLElement;
  let renderer: ReturnType<typeof createRenderer>;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    renderer = createRenderer(defaultRendererOptions);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it('ref 变化应触发组件重渲染（文本）', async () => {
    const count = ref(1);
    const Counter = { render: () => h('p', null, `Count: ${count.value}`) };

    renderer.render(h(Counter), container);
    expect(container.textContent).toBe('Count: 1');

    count.value = 2;
    await flush();
    expect(container.textContent).toBe('Count: 2');
  });

  it('ref 变化应触发列表重渲染（keyed diff）', async () => {
    const items = ref(['a', 'b']);
    const List = {
      render: () =>
        h('ul', null, items.value.map((t) => h('li', { key: t }, t))),
    };

    renderer.render(h(List), container);
    expect(container.querySelectorAll('li')).toHaveLength(2);

    items.value = ['a', 'b', 'c'];
    await flush();
    const lis = container.querySelectorAll('li');
    expect(lis).toHaveLength(3);
    expect(Array.from(lis).map((li) => li.textContent)).toEqual(['a', 'b', 'c']);
  });

  it('仅依赖变更的组件应重渲染，DOM 节点被复用', async () => {
    const count = ref(0);
    const Comp = { render: () => h('button', { id: 'btn' }, String(count.value)) };

    renderer.render(h(Comp), container);
    const btn = container.querySelector('#btn');
    expect(btn?.textContent).toBe('0');

    count.value = 5;
    await flush();
    // 复用同一 DOM 节点（patchElement 而非重建）
    expect(container.querySelector('#btn')).toBe(btn);
    expect(btn?.textContent).toBe('5');
  });

  it('组件卸载后 ref 变化不再报错/重渲染', async () => {
    const count = ref(0);
    const Comp = { render: () => h('span', null, String(count.value)) };

    renderer.render(h(Comp), container);
    renderer.render(null, container);
    expect(container.innerHTML).toBe('');

    count.value = 1;
    await flush();
    expect(container.innerHTML).toBe('');
  });
});
