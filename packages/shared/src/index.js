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