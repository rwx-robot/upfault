# UpFault Framework

> 高性能、轻量级的全栈响应式框架 —— 从 Diff 算法到 SSR 水合的完整解决方案

[![npm version](https://img.shields.io/npm/v/@upfault/runtime.svg)](https://www.npmjs.com/package/@upfault/runtime)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue.svg)](https://www.typescriptlang.org/)

## ✨ 特性

- **⚡ AeroDiff O(n) 算法** - 双端扩散 + Key 索引 + 类型兜底，10000 节点 < 200ms
- **🔄 细粒度响应式** - Proxy + Dep 图，`ref`/`computed`/`watch`/`effect` 完整 API
- **🎯 优先级调度器** - 5 级优先级 + 时间分片 + 定时器队列
- **🧠 预测缓存层** - UpdateFingerprint + 自适应阈值，智能跳过误报纠正
- **🌊 SSR 完整支持** - 字符串/流式渲染 + 完整/部分/懒加载水合
- **📦 模块化设计** - 10 个独立包，按需引入，Tree-shaking 友好

## 📦 包列表

| 包 | 描述 | 体积 (gzipped) |
|-----|------|----------------|
| `@upfault/runtime` | 核心运行时：VNode、组件、Renderer | ~3.2 kB |
| `@upfault/reactivity` | 细粒度响应式系统 | ~2.8 kB |
| `@upfault/diff` | AeroDiff O(n) Diff 算法 | ~2.1 kB |
| `@upfault/scheduler` | 优先级任务调度器 | ~1.9 kB |
| `@upfault/predict-cache` | 更新预测缓存 | ~1.5 kB |
| `@upfault/ssr` | 服务端渲染 + 客户端水合 | ~8.4 kB |
| `@upfault/compiler` | 模板编译器 | ~12 kB |
| `@upfault/cli` | 脚手架工具 | - |
| `@upfault/devtools` | 开发调试工具 | ~2.5 kB |
| `@upfault/shared` | 共享类型与工具 | - |

## 🚀 快速开始

```bash
# 安装核心运行时
npm i @upfault/runtime @upfault/reactivity @upfault/shared

# 或完整安装
npm i @upfault/runtime @upfault/reactivity @upfault/diff @upfault/scheduler @upfault/ssr @upfault/shared
```

```ts
// Counter 示例
import { h, ref, onMounted } from '@upfault/runtime';
import { createRenderer, defaultRendererOptions } from '@upfault/runtime';

function Counter() {
  const count = ref(0);
  onMounted(() => console.log('Mounted!'));
  
  return () => h('div', { class: 'counter' }, [
    h('p', null, `Count: ${count.value}`),
    h('button', { onClick: () => count.value++ }, 'Increment'),
  ]);
}

const renderer = createRenderer(defaultRendererOptions);
renderer.render(h(Counter), document.getElementById('app')!);
```

## 🌊 SSR 使用

```ts
import { renderToString, hydrate } from '@upfault/ssr';
import { h } from '@upfault/runtime';

// 服务端渲染
const html = renderToString(h(App));

// 客户端水合
hydrate(appVNode, document.getElementById('app')!);
