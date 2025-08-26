/**
 * @upfault/runtime —— 真实 SPA（examples/spa）端到端渲染回归
 *
 * 这个测试直接驱动 M5 基准的被测应用 App，覆盖「多子节点 + 组件 props 下传」
 * 这一基准自检暴露的场景：点击 done 过滤器后，子组件 TodoList 必须拿到新的 items。
 *
 * 与 render-effect.test.ts 的差别：那里的 App 只有 1 个子节点，
 * 这里还原真实结构（3 个「无 key」子节点，其中 2 个是组件）。
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { h, createRenderer, defaultRendererOptions } from '@upfault/runtime';

// App 在模块作用域读取 location.search 决定初始条目数（?n=，默认 200）。
// 因此必须先改 URL 再动态 import，否则拿到的是 200 条的规模。
window.history.replaceState({}, '', '/?n=6');
const { App } = await import('../../../examples/spa/src/App');

const flush = async () => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};

describe('examples/spa App 端到端渲染', () => {
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

  it('点击 done 过滤器后列表应只剩已完成项', async () => {
    renderer.render(h(App), container);

    expect(container.querySelectorAll('.item')).toHaveLength(6);
    expect(container.querySelector('.stat.total')?.textContent).toBe('Total: 6');

    const doneBtn = container.querySelector('[data-filter="done"]') as HTMLElement;
    expect(doneBtn).toBeTruthy();
    doneBtn.click();
    await flush();

    // 按钮自身状态应更新（filter 已切换）
    expect(container.querySelector('.filter-btn.is-active')?.textContent).toBe('done');
    // 关键断言：子组件 TodoList 的 items 必须同步更新
    expect(container.querySelectorAll('.item')).toHaveLength(2);
  });

  it('点击 active 过滤器后列表应只剩未完成项', async () => {
    renderer.render(h(App), container);

    const activeBtn = container.querySelector('[data-filter="active"]') as HTMLElement;
    activeBtn.click();
    await flush();

    expect(container.querySelectorAll('.item')).toHaveLength(4);
  });
});
