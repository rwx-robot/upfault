/**
 * Worker 传输层
 *
 * 职责：把可卸载的纯计算派发到 Worker，主线程只负责派发与提交。
 * 三条降级路径保证「任何环境下 API 行为一致、结果正确」：
 *   1. Worker 不可用（无 Worker/Blob、创建失败）→ 本地同步执行
 *   2. 单次计算超时 → 本地重算并采用本地结果（正确性优先）
 *   3. 待处理任务超过背压阈值 → 本地执行（避免消息堆积）
 */

import { buildWorkerScript, type WorkerRequest, type WorkerResponse } from './protocol';
import { computeRegistry, type ComputeFn } from './compute-registry';

/** 最小 Worker 接口（便于测试注入 mock） */
export interface WorkerLike {
  postMessage(message: unknown): void;
  terminate(): void;
  onmessage: ((event: { data: unknown }) => void) | null;
  onerror: ((event: unknown) => void) | null;
}

export type WorkerFactory = () => WorkerLike | null;

export interface WorkerTransportOptions {
  /** Worker 工厂；缺省使用浏览器 Blob Worker */
  factory?: WorkerFactory;
  /** 单次计算超时 (ms)，超时后本地重算。默认 1000 */
  timeout?: number;
  /** 最大并发待处理数，超出则本地执行。默认 64 */
  maxPending?: number;
  /** 构造时是否立即初始化。默认 true */
  autoInit?: boolean;
}

export interface TransportStats {
  /** 已初始化 */
  ready: boolean;
  /** Worker 是否可用 */
  available: boolean;
  /** 卸载到 Worker 的次数 */
  offloaded: number;
  /** 本地执行次数 */
  local: number;
  /** 失败次数（Worker 报错且本地也失败） */
  failed: number;
  /** 超时次数（随后本地重算） */
  timeouts: number;
  /** 当前待处理数 */
  pending: number;
  /** Worker 内计算耗时累计 (ms) */
  workerComputeMs: number;
  /** 主线程因派发占用的累计时间 (ms) —— 验收 M1「主线程阻塞 <5ms」的关键指标 */
  mainThreadDispatchMs: number;
  /** 最近一次执行模式 */
  lastMode: 'worker' | 'local' | 'none';
}

const DEFAULT_TIMEOUT = 1000;
const DEFAULT_MAX_PENDING = 64;

/**
 * Node 环境工厂：worker_threads（SSR / 基准 / 测试可用）。
 * 无 worker_threads 或不在 Node 下时返回 null（自动降级）。
 */
export function nodeWorkerFactory(): WorkerLike | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const req = typeof require === 'function' ? require : null;
  if (!req) return null;

  try {
    const { Worker } = req('worker_threads');
    const worker = new Worker(buildWorkerScript(), { eval: true });
    return {
      postMessage: (message: unknown) => worker.postMessage(message),
      terminate: () => void worker.terminate(),
      set onmessage(fn: ((event: { data: unknown }) => void) | null) {
        worker.removeAllListeners('message');
        if (fn) worker.on('message', (data: unknown) => fn({ data }));
      },
      get onmessage() {
        return null;
      },
      set onerror(fn: ((event: unknown) => void) | null) {
        worker.removeAllListeners('error');
        if (fn) worker.on('error', fn);
      },
      get onerror() {
        return null;
      },
    } as WorkerLike;
  } catch {
    return null;
  }
}

/** 浏览器默认工厂：Blob Worker（无需额外文件路径，随包携带） */
export function defaultWorkerFactory(): WorkerLike | null {
  if (typeof Worker === 'undefined') return null;
  if (typeof Blob === 'undefined' || typeof URL === 'undefined') return null;
  if (typeof URL.createObjectURL !== 'function') return null;

  try {
    const blob = new Blob([buildWorkerScript()], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    const worker = new Worker(url);
    if (typeof URL.revokeObjectURL === 'function') URL.revokeObjectURL(url);
    return worker as unknown as WorkerLike;
  } catch {
    return null;
  }
}

export class WorkerTransport {
  private options: Required<Pick<WorkerTransportOptions, 'timeout' | 'maxPending'>> & WorkerTransportOptions;
  private worker: WorkerLike | null = null;
  private initPromise: Promise<boolean> | null = null;
  private ready = false;
  private nextId = 1;
  private pending = new Map<number, {
    resolve: (value: unknown) => void;
    reject: (reason: unknown) => void;
    timer: ReturnType<typeof setTimeout> | null;
    name: string;
    args: unknown[];
  }>();

  private stats: TransportStats = {
    ready: false,
    available: false,
    offloaded: 0,
    local: 0,
    failed: 0,
    timeouts: 0,
    pending: 0,
    workerComputeMs: 0,
    mainThreadDispatchMs: 0,
    lastMode: 'none',
  };

  constructor(options: WorkerTransportOptions = {}) {
    this.options = {
      timeout: options.timeout ?? DEFAULT_TIMEOUT,
      maxPending: options.maxPending ?? DEFAULT_MAX_PENDING,
      ...options,
    };
    if (this.options.autoInit !== false) {
      void this.init();
    }
  }

  /** 初始化 Worker（幂等）。返回 Worker 是否可用 */
  init(): Promise<boolean> {
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise<boolean>((resolve) => {
      const factory = this.options.factory ?? defaultWorkerFactory;
      let worker: WorkerLike | null = null;

      try {
        worker = factory();
      } catch {
        worker = null;
      }

      // 未显式指定工厂时，依次回退：Web Worker(Blob) → Node worker_threads
      if (!worker && !this.options.factory) {
        try {
          worker = nodeWorkerFactory();
        } catch {
          worker = null;
        }
      }

      if (!worker) {
        this.stats.available = false;
        this.stats.ready = true; // 降级就绪：所有计算走本地
        this.ready = true;
        resolve(false);
        return;
      }

      this.worker = worker;

      worker.onmessage = (event) => {
        this.handleMessage(event.data as WorkerResponse);
      };
      worker.onerror = () => {
        // Worker 运行期出错：终止并永久降级
        this.stats.failed++;
        this.teardownWorker();
        this.stats.available = false;
        this.ready = true;
        this.rejectAllPending(new Error('worker error'));
      };

      const sources = computeRegistry.toSources();
      this.post({ type: 'init', registry: { sources } });

      this.stats.available = true;
      this.stats.ready = true;
      this.ready = true;
      resolve(true);
    });

    return this.initPromise;
  }

  /** 执行一次计算，自动选择 Worker 或本地 */
  async compute<T = unknown>(name: string, args: unknown[] = []): Promise<T> {
    const fn = computeRegistry.get(name);
    if (!fn) {
      this.stats.failed++;
      throw new Error(`[WorkerTransport] 未注册的计算函数: ${name}`);
    }

    await this.init();

    // 降级判定：Worker 不可用 或 背压过高
    if (!this.stats.available || !this.worker || this.pending.size >= this.options.maxPending) {
      return this.runLocal<T>(fn, args);
    }

    return this.dispatch<T>(name, args, fn);
  }

  /** 派发到 Worker（含超时本地兜底） */
  private dispatch<T>(name: string, args: unknown[], fn: ComputeFn): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const id = this.nextId++;

      const timer = setTimeout(() => {
        const entry = this.pending.get(id);
        if (!entry) return;
        this.pending.delete(id);
        this.stats.pending = this.pending.size;
        this.stats.timeouts++;
        // 超时：本地重算，保证结果正确
        try {
          const value = fn(...args);
          this.stats.local++;
          this.stats.lastMode = 'local';
          resolve(value as T);
        } catch (e) {
          this.stats.failed++;
          reject(e);
        }
      }, this.options.timeout);

      this.pending.set(id, {
        resolve: resolve as (value: unknown) => void,
        reject,
        timer,
        name,
        args,
      });
      this.stats.pending = this.pending.size;

      const t0 = now();
      this.post({ type: 'compute', id, name, args });
      // 主线程占用 = 序列化 + postMessage 的同步开销
      this.stats.mainThreadDispatchMs += now() - t0;
    });
  }

  private runLocal<T>(fn: ComputeFn, args: unknown[]): T {
    const t0 = now();
    try {
      const value = fn(...args);
      this.stats.local++;
      this.stats.lastMode = 'local';
      return value as T;
    } catch (e) {
      this.stats.failed++;
      throw e;
    } finally {
      // 本地执行即主线程占用
      this.stats.mainThreadDispatchMs += now() - t0;
    }
  }

  private handleMessage(msg: WorkerResponse): void {
    if (!msg || typeof msg !== 'object') return;

    if (msg.type === 'ready') return;

    if (msg.type === 'result') {
      const entry = this.pending.get(msg.id);
      if (!entry) return; // 已超时/已取消：结果丢弃
      this.pending.delete(msg.id);
      clearTimeout(entry.timer ?? undefined);
      this.stats.pending = this.pending.size;
      this.stats.offloaded++;
      this.stats.workerComputeMs += msg.duration ?? 0;
      this.stats.lastMode = 'worker';
      entry.resolve(msg.value);
      return;
    }

    if (msg.type === 'error') {
      if (msg.id === -1) return; // 注册阶段错误，已由 init 处理
      const entry = this.pending.get(msg.id);
      if (!entry) return;
      this.pending.delete(msg.id);
      clearTimeout(entry.timer ?? undefined);
      this.stats.pending = this.pending.size;

      // Worker 内报错 → 尝试本地重算
      const fn = computeRegistry.get(entry.name);
      if (fn) {
        try {
          const value = fn(...entry.args);
          this.stats.local++;
          this.stats.lastMode = 'local';
          entry.resolve(value);
          return;
        } catch {
          /* 落到下方 reject */
        }
      }
      this.stats.failed++;
      entry.reject(new Error(msg.message));
      return;
    }

    if (msg.type === 'cancelled') {
      const entry = this.pending.get(msg.id);
      if (!entry) return;
      this.pending.delete(msg.id);
      clearTimeout(entry.timer ?? undefined);
      this.stats.pending = this.pending.size;
      entry.reject(new Error('cancelled'));
    }
  }

  /** 取消一个计算（若仍在 pending） */
  cancel(id: number): void {
    const entry = this.pending.get(id);
    if (!entry) return;
    this.post({ type: 'cancel', id });
  }

  private post(msg: WorkerRequest): void {
    try {
      this.worker?.postMessage(msg);
    } catch {
      // 结构化克隆失败（参数含不可序列化值）→ 交由调用方超时/本地兜底
    }
  }

  private rejectAllPending(reason: unknown): void {
    for (const [, entry] of this.pending) {
      clearTimeout(entry.timer ?? undefined);
      entry.reject(reason);
    }
    this.pending.clear();
    this.stats.pending = 0;
  }

  private teardownWorker(): void {
    try {
      this.worker?.terminate();
    } catch {
      /* ignore */
    }
    this.worker = null;
  }

  /** 释放资源 */
  dispose(): void {
    this.rejectAllPending(new Error('transport disposed'));
    this.teardownWorker();
    this.ready = false;
    this.stats.available = false;
    this.initPromise = null;
  }

  getStats(): TransportStats {
    return { ...this.stats, pending: this.pending.size };
  }

  /** 主线程单次派发平均占用 (ms) —— M1 验收指标 */
  get averageDispatchMs(): number {
    const total = this.stats.offloaded + this.stats.local;
    return total === 0 ? 0 : this.stats.mainThreadDispatchMs / total;
  }

  get isReady(): boolean {
    return this.ready;
  }
}

function now(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}
