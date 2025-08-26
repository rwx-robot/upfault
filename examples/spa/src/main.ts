/**
 * M5 真实 SPA 入口
 *
 * 仅测量「框架首次挂载」本身的耗时（t0..t1），
 * 与浏览器 paint 时间（FCP）分开记录，供基准脚本交叉比对。
 */

import { createRenderer, defaultRendererOptions, h } from '@upfault/runtime';
import { App, addTodo } from './App';

const renderer = createRenderer(defaultRendererOptions);
const container = document.getElementById('app')!;

const t0 = performance.now();
renderer.render(h(App), container);
const t1 = performance.now();

performance.mark('upfault:render-end');

const nodes = container.querySelectorAll('*').length;

// 暴露给基准脚本
(window as any).__upfault = {
  renderMs: t1 - t0,
  nodes,
  addTodo,
};
