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