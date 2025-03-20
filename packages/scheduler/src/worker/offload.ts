/**
 * offload —— 把纯计算卸载到 Worker 的高级 API
 *
 * 决策顺序：
 *   1. Worker 不可用 → 本地
 *   2. 估算成本低于阈值 → 本地（小任务走 Worker 反而因消息开销变慢）
 *   3. 否则 → Worker
 *
 * 无论走哪条路径，返回值语义一致，调用方无需关心执行位置。
 */

import { WorkerTransport, type WorkerTransportOptions } from './transport';
import { computeRegistry } from './compute-registry';

let defaultTransport: WorkerTransport | null = null;

export function getDefaultTransport(options?: WorkerTransportOptions): WorkerTransport {
  if (!defaultTransport) {
    defaultTransport = new WorkerTransport(options);
  }
  return defaultTransport;
}

/** 重置默认传输层（测试用） */
export function resetDefaultTransport(): void {
  defaultTransport?.dispose();
  defaultTransport = null;
}

export interface OffloadOptions {
  /** 成本估算（如数组长度）。未提供时按参数规模粗估 */
  cost?: number;
  /** 低于该成本走本地。默认 1000 */
  threshold?: number;
  /** 指定传输层，默认用全局共享实例 */
  transport?: WorkerTransport;
  /** 强制本地（调试/对比用） */
  forceLocal?: boolean;
}

/** 粗估参数规模：数组的 length 之和 + 对象的键数量 */
function estimateCost(args: unknown[]): number {
  let cost = 0;
  for (const arg of args) {
    if (Array.isArray(arg)) cost += arg.length;
    else if (arg && typeof arg === 'object') cost += Object.keys(arg as object).length;
  }
  return cost;
}

/**
 * 执行一个已注册的纯计算，自动选择 Worker 或本地。
 */
export async function offload<T = unknown>(
  name: string,
  args: unknown[] = [],
  options: OffloadOptions = {},
): Promise<T> {
  const transport = options.transport ?? getDefaultTransport();
  const threshold = options.threshold ?? 1000;
  const cost = options.cost ?? estimateCost(args);

  if (options.forceLocal || cost < threshold) {
    const fn = computeRegistry.get(name);
    if (!fn) throw new Error(`[offload] 未注册的计算函数: ${name}`);
    return fn(...args) as T;
  }

  return transport.compute<T>(name, args);
}

/** 同步版本：始终本地执行（SSR / 无异步上下文场景） */
export function offloadSync<T = unknown>(name: string, args: unknown[] = []): T {
  const fn = computeRegistry.get(name);
  if (!fn) throw new Error(`[offloadSync] 未注册的计算函数: ${name}`);
  return fn(...args) as T;
}

/**
 * 键序列 diff 的卸载入口。
 * 列表更新是主线程最容易卡顿的场景之一：比对在 Worker 完成，
 * 主线程只接收下标映射并据此提交 DOM。
 */
export function diffKeyedSequence(
  oldKeys: unknown[],
  newKeys: unknown[],
  options?: OffloadOptions,
): Promise<number[]> {
  return offload<number[]>('keyedSequenceDiff', [oldKeys, newKeys], options);
}
