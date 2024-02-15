/**
 * UpFault Reactivity Types - 细粒度响应式系统核心类型
 *
 * 基于 Proxy + 依赖追踪，参考 Vue 3 / SolidJS 设计
 * 支持 ref, computed, effect, watch, batch 等核心 API
 */
export interface Ref<T> {
    /** 当前值 (访问时自动追踪依赖) */
    value: T;
    /** 内部标识 */
    readonly __v_isRef: true;
    /** 仅读取不追踪 (内部用) */
    _getter?: () => T;
    /** 仅设置不触发 (内部用) */
    _setter?: (value: T) => void;
}
/** 只读 Ref */
export interface ReadonlyRef<T> {
    readonly value: T;
    readonly __v_isRef: true;
    readonly __v_isReadonly: true;
}
/** 计算属性 */
export interface ComputedRef<T> {
    readonly value: T;
    readonly __v_isComputed: true;
    readonly __v_isReadonly: true;
}
/** 响应式对象标记 */
export interface ReactiveMarker {
