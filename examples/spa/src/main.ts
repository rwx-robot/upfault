/**
 * M5 真实 SPA 入口
 *
 * 度量口径（四实现统一）：renderMs = 入口模块开始执行 → 首屏 DOM 就绪。
 * 与浏览器 paint 时间分开记录，供基准脚本交叉比对。
 */

import { createRenderer, defaultRendererOptions, h } from '@upfault/runtime';
import { App, addTodo } from './App';

// 入口模块首行取基准点：四个实现（upfault/vanilla/react/vue）口径一致
const t0 = performance.now();

const renderer = createRenderer(defaultRendererOptions);
const container = document.getElementById('app')!;

renderer.render(h(App), container);

const t1 = performance.now();

performance.mark('upfault:render-end');

const nodes = container.querySelectorAll('*').length;

// 统一的基准取数口径（四实现同名）
(window as any).__spa = { renderMs: t1 - t0, nodes };

// upfault 专属：追加待办的交互路径需要拿到 addTodo
(window as any).__upfault = { renderMs: t1 - t0, nodes, addTodo };
