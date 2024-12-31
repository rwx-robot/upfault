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
  ComponentInstance,
  Ref as DiffRef,
  UpdateFingerprint,
} from './diff';

// VNodeType, PatchFlags, DiffOpType, DEFAULT_AERODIFF_OPTIONS are const enums/values
export { VNodeType, PatchFlags, DiffOpType, DEFAULT_AERODIFF_OPTIONS } from './diff';

// UpdateFingerprint 类型由 ./diff 本地定义（VNode.fingerprint 契约）。
// 此前这里错误地 re-export 了 @upfault/predict-cache（上层包），构成
// shared -> predict-cache -> shared 的循环依赖，已移除。

// Utils - 通用工具函数
export {
  isSameNode,
  isObject,
  isFunction,
  isString,
  isNumber,
  isPromise,
  isRef,
  isComputedRef,
  isReactive,
  isReadonly,
  isVNode,
  NOOP,
  IDENTITY,
  hasChanged,
  flatten,
  generateId,
  generateNumericId,
  deepClone,
  mergeObjects,
  unique,
  chunk,
  debounce,
  throttle,
  flattenTree,
  traverseTreeBFS,
  PerformanceTimer,
  LRUCache,
  isType,
  assert,
  warn,
  error,
} from './utils';

// 版本信息
export const VERSION = '0.2.0';
export const PACKAGE_NAME = '@upfault/shared';