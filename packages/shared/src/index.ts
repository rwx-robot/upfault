/**
 * @upfault/shared - UpFault 共享类型、常量与工具函数
 * 
 * 所有包的基础依赖，提供统一的类型定义
 * 版本: 0.2.0
 */

// Flags - VNode 编译时标记
export {
  VNodeFlags,
  isStaticNode,
  isPureDynamic,
  isInteractive,
  isSkippable,
  isFrequentUpdate,
  markFrequentUpdate,
  unmarkFrequentUpdate,
  describeFlags,
} from './flags';

// Scheduler - 调度器核心类型
export type {
  Priority,
  PriorityNames,
  priorityFromExpirationTime,
  computeExpirationTime,
  SchedulerTask,
  SchedulerOptions,
  SchedulerStats,
  TaskQueue,
  VNodeType as SchedulerVNodeType,
} from './scheduler';

// DEFAULT_SCHEDULER_OPTIONS is a const value, not just a type
export { DEFAULT_SCHEDULER_OPTIONS } from './scheduler';

// Reactivity - 细粒度响应式类型
export type {
  Ref,
  ReadonlyRef,
  ComputedRef,
  ComputedGetter,
  ComputedSetter,
  ReactiveMarker,
  Reactive,
  ReadonlyReactive,
  ShallowReactive,
  Dep,
  Effect,
  DebuggerEvent,
  TrackOpTypes,
  TriggerOpTypes,
  ReactivityOptions,
  DEFAULT_REACTIVITY_OPTIONS,
  BatchContext,
  WatchOptions,
  WatchCallback,
  WatchSource,
  WatchStopHandle,
  UnwrapRef,
  UnwrapRefs,
  ShallowUnwrapRef,
  RefUnwrapBailTypes,
} from './reactivity';

// Diff - AeroDiff 算法类型
export type {
  VNode,
  VNodeProps,
  Block,
  DiffOp,
  DiffResult,
  DiffStats,
  DiffIndex,
  AeroDiffOptions,
  Component,