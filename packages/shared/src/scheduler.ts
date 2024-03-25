/**
 * UpFault Scheduler Types - 优先级调度器核心类型
 * 
 * 基于 React Fiber + Vue 3 调度思想，针对 Block 级粒度优化
 * 支持时间分片、优先级抢占、依赖感知调度
 */

export const enum Priority {
  /** 同步立即执行 - 用户输入、动画帧 */