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
    readonly __v_isReactive: true;
    readonly __v_isReadonly?: true;
    readonly __v_isShallow?: true;
    readonly __v_raw: object;
}
/** 响应式对象类型 */
export type Reactive<T extends object> = T & ReactiveMarker;
/** 只读响应式对象 */
export type ReadonlyReactive<T extends object> = Readonly<T> & ReactiveMarker;
/** 浅层响应式 */
export type ShallowReactive<T extends object> = T & ReactiveMarker & {
    readonly __v_isShallow: true;
};
/** 依赖追踪上下文 */
export interface Dep {
    /** 订阅者 Set */
    subs: Set<Effect>;
    /** 版本号 (用于优化) */
    version: number;
    /** 依赖名称 (调试用) */
    name?: string;
}
/** Effect 副作用函数 */
export interface Effect {
    /** 执行函数 */
    fn: () => void;
    /** 调度器 */
    scheduler?: (fn: () => void) => void;
    /** 依赖集合 */
    deps: Dep[];
    /** 是否激活 */
    active: boolean;
    /** 是否停止 */
    stopped: boolean;
    /** 是否允许递归 */
    allowRecurse: boolean;
    /** 执行时的依赖追踪上下文 */
    onTrack?: (event: DebuggerEvent) => void;
    /** 触发时的回调 */
    onTrigger?: (event: DebuggerEvent) => void;
    /** 清理函数 */
    cleanup?: () => void;
}
/** 调试事件 */
export interface DebuggerEvent {
    effect: Effect;
    target: object;
    key: string | symbol;
    type: TrackOpTypes | TriggerOpTypes;
    newValue?: unknown;
    oldValue?: unknown;
    oldTarget?: Map<unknown, unknown> | Set<unknown>;
}
/** 依赖追踪操作类型 */
export declare const enum TrackOpTypes {
    GET = "get",
    HAS = "has",
    ITERATE = "iterate"
}
/** 触发操作类型 */
export declare const enum TriggerOpTypes {
    SET = "set",
    ADD = "add",
    DELETE = "delete",
    CLEAR = "clear"
}
/** 响应式系统配置 */
export interface ReactivityOptions {
    /** 是否开启调试模式 */
    debug: boolean;
    /** 计算属性缓存策略 */
    computedCache: 'always' | 'never' | 'auto';
    /** Effect 默认调度器 */
    effectScheduler?: (fn: () => void) => void;
    /** 最大递归深度 */
    maxRecursionDepth: number;
}
/** 默认响应式配置 */
export declare const DEFAULT_REACTIVITY_OPTIONS: ReactivityOptions;
/** 批处理上下文 */
export interface BatchContext {
    /** 待执行的 effect 队列 */
    effects: Effect[];
    /** 是否正在批处理 */
    isBatching: boolean;
    /** 嵌套层级 */
    depth: number;
}
/** Watch 选项 */
export interface WatchOptions<Immediate extends boolean = false> {
    /** 立即执行 */