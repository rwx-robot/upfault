/**
 * @upfault/shared - UpFault 共享类型、常量与工具函数
 *
 * 所有包的基础依赖，提供统一的类型定义
 * 版本: 0.2.0
 */
// Flags - VNode 编译时标记
export { VNodeFlags, isStaticNode, isPureDynamic, isInteractive, isSkippable, isFrequentUpdate, markFrequentUpdate, unmarkFrequentUpdate, describeFlags, } from './flags';
// Scheduler - 调度器核心类型
export { Priority, PriorityNames, priorityFromExpirationTime, computeExpirationTime, DEFAULT_SCHEDULER_OPTIONS, VNodeType as SchedulerVNodeType, } from './scheduler';
// Reactivity - 细粒度响应式类型
export { TrackOpTypes, TriggerOpTypes, DEFAULT_REACTIVITY_OPTIONS, } from './reactivity';
// Diff - AeroDiff 算法类型
export { VNodeType, PatchFlags, DiffOpType, DEFAULT_AERODIFF_OPTIONS, } from './diff';
// Predict - 预测缓存层类型