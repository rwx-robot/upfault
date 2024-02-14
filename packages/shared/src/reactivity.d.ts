/**
 * UpFault Reactivity Types - 细粒度响应式系统核心类型
 *
 * 基于 Proxy + 依赖追踪，参考 Vue 3 / SolidJS 设计
 * 支持 ref, computed, effect, watch, batch 等核心 API
 */
export interface Ref<T> {
    /** 当前值 (访问时自动追踪依赖) */
    value: T;