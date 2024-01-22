/**
 * @upfault/shared - UpFault 共享类型、常量与工具函数
 *
 * 所有包的基础依赖，提供统一的类型定义
 * 版本: 0.2.0
 */
export { VNodeFlags, isStaticNode, isPureDynamic, isInteractive, isSkippable, isFrequentUpdate, markFrequentUpdate, unmarkFrequentUpdate, describeFlags, } from './flags';
export { Priority, PriorityNames, priorityFromExpirationTime, computeExpirationTime, SchedulerTask, SchedulerOptions, DEFAULT_SCHEDULER_OPTIONS, SchedulerStats, TaskQueue, VNodeType as SchedulerVNodeType, } from './scheduler';
export { Ref, ReadonlyRef, ComputedRef, ComputedGetter, ComputedSetter, ReactiveMarker, Reactive, ReadonlyReactive, ShallowReactive, Dep, Effect, DebuggerEvent, TrackOpTypes, TriggerOpTypes, ReactivityOptions, DEFAULT_REACTIVITY_OPTIONS, BatchContext, WatchOptions, WatchCallback, WatchSource, WatchStopHandle, UnwrapRef, UnwrapRefs, ShallowUnwrapRef, RefUnwrapBailTypes, } from './reactivity';
export { VNode, VNodeType, VNodeProps, PatchFlags, Block, DiffOpType, DiffOp, DiffResult, DiffStats, DiffIndex, AeroDiffOptions, DEFAULT_AERODIFF_OPTIONS, Component, ComponentInstance, Ref as DiffRef, } from './diff';