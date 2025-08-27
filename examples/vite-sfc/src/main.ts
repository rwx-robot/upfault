/**
 * M6 生态工具链示例入口
 *
 * `./App.uf` 由 @upfault/vite-plugin 编译为普通 ESM 模块，
 * 其默认导出就是可直接交给 h() 的组件对象 —— 无需手写 render。
 */

import { createRenderer, defaultRendererOptions, h } from '@upfault/runtime';
import App from './App.uf';

const renderer = createRenderer(defaultRendererOptions);
const container = document.getElementById('app')!;

renderer.render(h(App), container);
