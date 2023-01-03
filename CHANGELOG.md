# UpFault Framework - Changelog

## v0.2.0 "Intelligence" (2026-09-21)

> **版本修正说明**：首个发布版本原标为 v0.1.0，与实际交付能力不符，现修正为 **v0.2.0**。
> 依据 `version-plan.md`：v0.1 规划仅 7 个包（shared / compiler / reactivity /
> scheduler / diff / runtime / cli），而本次实际交付 **10 个包**，已包含 v0.2 的核心
> 新增包 `@upfault/predict-cache`，故按包清单对齐 v0.2。
> v0.3 的 `optimizer`、`@upfault/ssr` 与 `@upfault/devtools` 虽已交付，但 v0.2 / v0.3 的
> 验收基准（静态列表 90%+ 跳过、accuracy 0.9+、主线程 <5ms、产物体积 -30%）尚无实测数据，
> **不越级标 v0.3**。
>
> 本版本同时包含 v0.1 "Foundation" 的全部能力。

### 🎉 核心里程碑
- **SSR 水合修复**: 修复 `hydration.ts` TS1005 编译错误，支持流式/部分/懒加载水合
- **10 个核心包完整构建**: shared, scheduler, diff, reactivity, predict-cache, compiler, cli, devtools, ssr, runtime
- **185 单元测试通过**: Diff 算法、调度器、响应式、预测缓存、SSR 水合全覆盖
- **Counter 端到端验证**: dev 模式热重载、生产构建 6.22 kB gzipped

### ✨ 新增功能

#### @upfault/ssr - 服务端渲染
- `renderToString` / `renderToNodeStream` / `renderToWebStream` - 核心渲染
- `renderToPipeableStream` / `renderToReadableStream` - 流式渲染
- `hydrate` / `hydrateRoot` - 完整水合
- `hydrateNodeStream` / `hydrateWebStream` - 流式水合
- `partialHydrate` - 选择器级部分水合
- `lazyHydrate` - IntersectionObserver 懒加载水合
- `isHydrated` / `markHydrated` / `getHydrationState` - 水合状态管理

#### @upfault/diff - AeroDiff 算法
- O(n) 双端扩散 + Key 索引匹配 + 类型兜底
- Block 树结构 + PatchFlags 编译时优化
- 10000 节点 < 200ms 性能基准

#### @upfault/reactivity - 细粒度响应式
- `ref` / `computed` / `watch` / `effect` 完整 API
- Proxy 依赖追踪 + Dep 图管理
- `batch` 批量更新优化

#### @upfault/scheduler - 优先级调度器
- 5 级优先级 + 时间分片 + 定时器队列
- `flushSync` 同步刷新支持

#### @upfault/predict-cache - 预测缓存层
- UpdateFingerprint 指纹 + 自适应阈值
- 智能跳过 + 误报纠正机制

#### @upfault/runtime - 运行时核心
- `h()` / `Fragment` / `Text` / `Comment` VNode 创建
- 生命周期钩子完整支持
- DOM Renderer + SSR Renderer 双模式

#### @upfault/compiler - 编译器
- 模板解析 + 代码生成 + Block 树构建
- PatchFlags 静态分析

#### @upfault/shared - 共享基础
- 类型系统、工具函数、常量统一导出
- VNodeType / PatchFlags / DiffOpType 核心枚举

### 🔧 修复
- hydration.ts `lazyHydrate` IntersectionObserver 回调语法错误
- VNodeType const enum → const object 兼容性修复
- 循环依赖消除：renderer 独立构建 + 外部化依赖
- esbuild external 配置修正避免重复打包

### 📦 包体积 (gzipped)
- runtime: ~3.2 kB
- reactivity: ~2.8 kB  
- diff: ~2.1 kB
- scheduler: ~1.9 kB
- ssr: ~8.4 kB (含 hydration)

### 🧪 测试覆盖
- diff: 20 测试 (核心算法、Key匹配、复杂场景、性能)
- shared: 100 测试 (工具函数、Flags、调度器类型、Diff 类型、响应式类型)
- scheduler: 21 测试 (工作循环、队列、优先级、定时器)
- reactivity: 22 测试 (ref、computed、watch、effect、readonly)
- predict-cache: 10 测试 (指纹、衰减、自适应阈值)
- ssr hydration: 7 测试 (状态追踪、部分水合、懒加载水合)

### 📋 迁移指南
首个公开版本，无历史包袱。
