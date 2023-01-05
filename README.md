# UpFault Framework

> 高性能、轻量级的全栈响应式框架 —— 从 Diff 算法到 SSR 水合的完整解决方案

[![npm version](https://img.shields.io/npm/v/@upfault/runtime.svg)](https://www.npmjs.com/package/@upfault/runtime)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue.svg)](https://www.typescriptlang.org/)

## ✨ 特性

- **⚡ AeroDiff O(n) 算法** - 双端扩散 + Key 索引 + 类型兜底，10000 节点 < 200ms
- **🔄 细粒度响应式** - Proxy + Dep 图，`ref`/`computed`/`watch`/`effect` 完整 API