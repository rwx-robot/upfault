/**
 * UpFault Scheduler Types - 优先级调度器核心类型
 * 
 * 基于 React Fiber + Vue 3 调度思想，针对 Block 级粒度优化
 * 支持时间分片、优先级抢占、依赖感知调度
 */

export const enum Priority {
  /** 同步立即执行 - 用户输入、动画帧 */
  IMMEDIATE = 0,
  
  /** 用户阻塞级 - 拖拽、滚动、交互反馈 (250ms 内) */
  USER_BLOCKING = 250,
  
  /** 正常优先级 - 默认渲染、数据更新 (5s 内) */
  NORMAL = 5_000,
  
  /** 低优先级 - 非可视区域、预取数据 (10s 内) */
  LOW = 10_000,
  
  /** 空闲优先级 - 后台计算、GC、预编译 (无截止时间) */
  IDLE = 0x7fffffff,
}

/**
 * 优先级人类可读名称
 */
export const PriorityNames: Record<Priority, string> = {
  [Priority.IMMEDIATE]: 'Immediate',
  [Priority.USER_BLOCKING]: 'UserBlocking',
  [Priority.NORMAL]: 'Normal',
  [Priority.LOW]: 'Low',
  [Priority.IDLE]: 'Idle',
};

/**
 * 从过期时间推算优先级
 */
export function priorityFromExpirationTime(expirationTime: number): Priority {
  const now = performance.now();
  const timeLeft = expirationTime - now;
  
  if (timeLeft <= 0) return Priority.IMMEDIATE;
  if (timeLeft <= 250) return Priority.USER_BLOCKING;
  if (timeLeft <= 5_000) return Priority.NORMAL;
  if (timeLeft <= 10_000) return Priority.LOW;
  return Priority.IDLE;
}

/**
 * 计算过期时间 (ms)
 */
export function computeExpirationTime(priority: Priority): number {
  const now = performance.now();
  switch (priority) {
    case Priority.IMMEDIATE:
      return now; // 已过期，强制同步执行
    case Priority.USER_BLOCKING:
      return now + 250;
    case Priority.NORMAL:
      return now + 5_000;
    case Priority.LOW:
      return now + 10_000;
    case Priority.IDLE:
      return now + 0x7fffffff;
  }
}

/**
 * 调度任务接口
 * 每个 Block / 组件更新对应一个任务
 */
export interface SchedulerTask<T = unknown> {
  /** 唯一任务 ID (单调递增) */
  id: number;
  
  /** 优先级 */
  priority: Priority;
  
  /** 执行回调 */
  callback: (task: SchedulerTask<T>) => void;
  
  /** 过期时间戳 (ms) */
  expirationTime: number;
  
  /** 关联的 VNode / Block */
  fibre: VNode | Block | null;
  
  /** 任务携带的数据 */
  data: T;
  
  /** 是否已取消 */
  cancelled: boolean;
  
  /** 创建时间 */
  createdAt: number;
  
  /** 开始执行时间 */
  startedAt: number | null;
  
  /** 完成时间 */
  completedAt: number | null;
}

/**
 * 调度器配置选项
 */
export interface SchedulerOptions {
  /** 时间分片预算 (ms) - 每帧留给主线程的时间 */
  timeSliceBudget: number;
  
  /** 是否启用 requestIdleCallback 回退 */
  useIdleCallback: boolean;
  
  /** 最大并发任务数 */
  maxConcurrentTasks: number;
  
  /** 优先级抢占阈值 - 高优任务可中断低优任务 */
  preemptionThreshold: Priority;
}

/** 默认调度器配置 */
export const DEFAULT_SCHEDULER_OPTIONS: SchedulerOptions = {
  timeSliceBudget: 5, // 5ms per frame (60fps = 16.6ms, 留 11ms 给浏览器)
  useIdleCallback: true,
  maxConcurrentTasks: 100,
  preemptionThreshold: Priority.USER_BLOCKING,
};

/**
 * 调度器统计信息
 */
export interface SchedulerStats {
  /** 总任务数 */
  totalTasks: number;
  
  /** 已完成任务数 */
  completedTasks: number;
  
  /** 已取消任务数 */
  cancelledTasks: number;
  
  /** 当前队列长度 */
  queueLength: number;
  
  /** 平均执行时间 (ms) */
  avgExecutionTime: number;
  
  /** 总执行时间 (ms) */
  totalExecutionTime: number;
  
  /** 抢占次数 */
  preemptionCount: number;
  
  /** 按优先级分布 */
  priorityDistribution: Record<Priority, number>;
}

/**
 * 任务队列接口 (最小堆实现)
 */
export interface TaskQueue {
  /** 入队 */
  push(task: SchedulerTask): void;
  
  /** 出队最高优先级任务 */
  pop(): SchedulerTask | null;
  
  /** 查看最高优先级任务 */
  peek(): SchedulerTask | null;
  
  /** 是否有更高优先级任务 */
  hasHigherPriority(priority: Priority): boolean;
  
  /** 移除特定任务 */
  remove(task: SchedulerTask): boolean;
  
  /** 清空队列 */
  clear(): void;
  
  /** 队列长度 */
  readonly size: number;
  
  /** 是否为空 */
  readonly isEmpty: boolean;
}

/**
 * VNode 前向声明 (避免循环依赖)
 */
export interface VNode {
  flags: number;
  type: VNodeType;
  key: string | number | null;
  children: VNode[];
  // ... 其他字段在 runtime 包中定义
}

/**
 * Block 前向声明
 */
export interface Block {
  id: string;
  nodes: VNode[];
  priority: Priority;
  // ... 其他字段在 runtime 包中定义
}
