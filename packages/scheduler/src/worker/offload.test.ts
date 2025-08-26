/**
 * Worker 协作层测试
 *
 * 测试环境（jsdom/node）没有真实 Worker，因此：
 * - 用 **mock Worker** 验证协议正确性（init / result / error / cancel）
 * - 用 **factory 返回 null** 验证降级路径与结果正确性
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  WorkerTransport,
  computeRegistry,
  registerBuiltinComputes,
  keyedSequenceDiff,
  stableSortBy,
  chunkHash,
  offload,
  offloadSync,
  diffKeyedSequence,
  getDefaultTransport,
  resetDefaultTransport,
  buildWorkerScript,
  type WorkerLike,
  type WorkerResponse,
} from './index';

/** 可编程的 mock Worker：模拟真 Worker 的消息循环 */
class MockWorker implements WorkerLike {
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  terminated = false;
  sent: unknown[] = [];

  constructor(
    private readonly handle: (msg: any, reply: (m: WorkerResponse) => void) => void,
    private readonly async = false,
  ) {}

  postMessage(message: unknown): void {
    this.sent.push(message);
    const reply = (m: WorkerResponse) => {
      if (this.async) setTimeout(() => this.onmessage?.({ data: m }), 0);
      else this.onmessage?.({ data: m });
    };
    this.handle(message, reply);
  }

  terminate(): void {
    this.terminated = true;
  }
}

/** 默认 mock：像真 Worker 一样执行注册表里的同名函数 */
function createComputeWorker(): MockWorker {
  const registry = new Map<string, (...args: any[]) => unknown>();
  return new MockWorker((msg: any, reply) => {
    if (msg.type === 'init') {
      for (const [name, src] of Object.entries(msg.registry.sources as Record<string, string>)) {
        // eslint-disable-next-line no-new-func
        registry.set(name, new Function(`return (${src})`)());
      }
      reply({ type: 'ready' });
      return;
    }
    if (msg.type === 'compute') {
      const fn = registry.get(msg.name);
      if (!fn) {
        reply({ type: 'error', id: msg.id, message: `unknown compute function: ${msg.name}` });
        return;
      }
      try {
        const value = fn(...(msg.args || []));
        reply({ type: 'result', id: msg.id, value, duration: 1 });
      } catch (e) {
        reply({ type: 'error', id: msg.id, message: (e as Error).message });
      }
      return;
    }
    if (msg.type === 'cancel') {
      reply({ type: 'cancelled', id: msg.id });
    }
  });
}

describe('计算注册表', () => {
  beforeEach(() => {
    computeRegistry.clear();
    registerBuiltinComputes();
  });

  it('应注册并提供内置计算', () => {
    expect(computeRegistry.has('keyedSequenceDiff')).toBe(true);
    expect(computeRegistry.has('stableSortBy')).toBe(true);
    expect(computeRegistry.has('chunkHash')).toBe(true);
    expect(computeRegistry.names().length).toBe(3);
  });

  it('应导出可注入 Worker 的源码表', () => {
    const sources = computeRegistry.toSources();
    expect(Object.keys(sources)).toContain('keyedSequenceDiff');
    expect(typeof sources['keyedSequenceDiff']).toBe('string');
  });

  it('应支持注销与清空', () => {
    expect(computeRegistry.unregister('chunkHash')).toBe(true);
    expect(computeRegistry.has('chunkHash')).toBe(false);
    computeRegistry.clear();
    expect(computeRegistry.names()).toHaveLength(0);
  });

  it('注册非函数应抛错', () => {
    expect(() => computeRegistry.register('bad', 123 as any)).toThrow(TypeError);
  });
});

describe('内置纯计算', () => {
  it('keyedSequenceDiff 应给出旧下标映射', () => {
    expect(keyedSequenceDiff(['a', 'b', 'c'], ['c', 'a', 'd'])).toEqual([2, 0, -1]);
  });

  it('keyedSequenceDiff 应处理重复 key（取首个位置）', () => {
    expect(keyedSequenceDiff(['a', 'a'], ['a'])).toEqual([0]);
  });

  it('stableSortBy 应保持同键的相对顺序', () => {
    const items = [{ k: 2, i: 1 }, { k: 1, i: 2 }, { k: 2, i: 3 }];
    const sorted = stableSortBy(items as any, 'k');
    expect(sorted.map((x: any) => x.i)).toEqual([2, 1, 3]);
  });

  it('chunkHash 应按块产出哈希', () => {
    const hashes = chunkHash([1, 2, 3, 4, 5], 2);
    expect(hashes).toHaveLength(3);
    expect(hashes.every((h) => Number.isInteger(h) && h >= 0)).toBe(true);
    // 相同输入 → 相同输出
    expect(chunkHash([1, 2, 3, 4, 5], 2)).toEqual(hashes);
  });
});

describe('降级路径（无 Worker）', () => {
  let transport: WorkerTransport;

  beforeEach(() => {
    computeRegistry.clear();
    registerBuiltinComputes();
    transport = new WorkerTransport({ factory: () => null });
  });

  afterEach(() => transport.dispose());

  it('应标记为不可用但仍可用（本地执行）', async () => {
    await transport.init();
    const stats = transport.getStats();
    expect(stats.available).toBe(false);
    expect(stats.ready).toBe(true);

    const result = await transport.compute<number[]>('keyedSequenceDiff', [['a', 'b'], ['b']]);
    expect(result).toEqual([1]);
    expect(transport.getStats().local).toBe(1);
    expect(transport.getStats().lastMode).toBe('local');
  });

  it('未注册的函数应抛错', async () => {
    await expect(transport.compute('不存在', [])).rejects.toThrow(/未注册/);
    expect(transport.getStats().failed).toBe(1);
  });

  it('offloadSync 应始终本地执行', () => {
    expect(offloadSync<number[]>('keyedSequenceDiff', [['x'], ['x']])).toEqual([0]);
  });
});

describe('Worker 路径（mock）', () => {
  let transport: WorkerTransport;
  let worker: MockWorker;

  beforeEach(async () => {
    computeRegistry.clear();
    registerBuiltinComputes();
    worker = createComputeWorker();
    transport = new WorkerTransport({ factory: () => worker });
    await transport.init();
  });

  afterEach(() => transport.dispose());

  it('init 应下发注册表源码', () => {
    const initMsg: any = worker.sent[0];
    expect(initMsg.type).toBe('init');
    expect(initMsg.registry.sources).toHaveProperty('keyedSequenceDiff');
  });

  it('应卸载计算并返回结果', async () => {
    const result = await transport.compute<number[]>('keyedSequenceDiff', [['a', 'b', 'c'], ['c', 'x']]);
    expect(result).toEqual([2, -1]);
    const stats = transport.getStats();
    expect(stats.offloaded).toBe(1);
    expect(stats.lastMode).toBe('worker');
    expect(stats.workerComputeMs).toBeGreaterThanOrEqual(0);
  });

  it('应统计主线程派发耗时', async () => {
    await transport.compute('keyedSequenceDiff', [['a'], ['a']]);
    const stats = transport.getStats();
    expect(stats.mainThreadDispatchMs).toBeGreaterThanOrEqual(0);
    expect(transport.averageDispatchMs).toBeGreaterThanOrEqual(0);
  });

  it('Worker 报错时应回退本地重算', async () => {
    const badWorker = new MockWorker((msg: any, reply) => {
      if (msg.type === 'init') return reply({ type: 'ready' });
      reply({ type: 'error', id: msg.id, message: 'boom' });
    });
    const t = new WorkerTransport({ factory: () => badWorker });
    await t.init();

    const result = await t.compute<number[]>('keyedSequenceDiff', [['a'], ['a']]);
    expect(result).toEqual([0]); // 本地兜底结果
    expect(t.getStats().lastMode).toBe('local');
    t.dispose();
  });
});

/** 让出一次事件循环，确保 async 派发已发生 */
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('异常与边界', () => {
  beforeEach(() => {
    computeRegistry.clear();
    registerBuiltinComputes();
  });

  it('超时后应本地重算', async () => {
    // 永不回复的 Worker + 极短超时（真实定时器，避免 fake timers 与 await 冲突）
    const silent = new MockWorker(() => { /* no reply */ });
    const t = new WorkerTransport({ factory: () => silent, timeout: 20 });
    await t.init();

    const result = await t.compute<number[]>('keyedSequenceDiff', [['a', 'b'], ['b']]);

    expect(result).toEqual([1]);
    expect(t.getStats().timeouts).toBe(1);
    expect(t.getStats().lastMode).toBe('local');
    t.dispose();
  });

  it('背压超限时应转本地执行', async () => {
    const slow = new MockWorker(() => { /* 不回复，保持 pending */ });
    const t = new WorkerTransport({ factory: () => slow, maxPending: 1 });
    await t.init();

    // 占用唯一 pending 名额（随后会被 dispose 拒绝，显式兜底避免 unhandled rejection）
    void t.compute('keyedSequenceDiff', [['a'], ['a']]).catch(() => {});
    const second = await t.compute<number[]>('keyedSequenceDiff', [['b'], ['b']]);

    expect(second).toEqual([0]);
    expect(t.getStats().local).toBeGreaterThanOrEqual(1);
    t.dispose();
  });

  it('取消 pending 任务应 reject', async () => {
    const worker = new MockWorker((msg: any, reply) => {
      if (msg.type === 'init') return reply({ type: 'ready' });
      if (msg.type === 'cancel') return reply({ type: 'cancelled', id: msg.id });
      // 不回复 compute
    });
    const t = new WorkerTransport({ factory: () => worker });
    await t.init();

    const promise = t.compute('keyedSequenceDiff', [['a'], ['a']]);
    await tick(); // 等 dispatch 发生后再取消息 id
    const computeMsg: any = worker.sent.find((m: any) => m.type === 'compute');
    expect(computeMsg).toBeDefined();
    t.cancel(computeMsg.id);

    await expect(promise).rejects.toThrow('cancelled');
    t.dispose();
  });

  it('dispose 应终止 Worker 并降级为本地执行', async () => {
    const worker = new MockWorker(() => { /* 不回复 */ });
    const t = new WorkerTransport({ factory: () => worker });
    await t.init();

    // 不回复的 Worker：compute 会保持 pending，随后被 dispose 拒绝（显式兜底避免 unhandled rejection）
    void t.compute('keyedSequenceDiff', [['a'], ['a']]).catch(() => {});
    await tick(); // 确保已进入 pending
    t.dispose();

    expect(worker.terminated).toBe(true);
    expect(t.getStats().available).toBe(false);

    // dispose 后的计算应降级为本地，结果依然正确
    const result = await t.compute<number[]>('keyedSequenceDiff', [['a', 'b'], ['b']]);
    expect(result).toEqual([1]);
    expect(t.getStats().lastMode).toBe('local');
  });
});

describe('offload 高级 API', () => {
  beforeEach(() => {
    computeRegistry.clear();
    registerBuiltinComputes();
    resetDefaultTransport();
  });

  afterEach(() => resetDefaultTransport());

  it('成本低于阈值应本地执行', async () => {
    const result = await offload<number[]>('keyedSequenceDiff', [['a'], ['a']], {
      threshold: 1000, // cost = 2 (数组长度和) < 1000
    });
    expect(result).toEqual([0]);
    // 未创建 Worker：默认传输层走本地
    expect(getDefaultTransport().getStats().offloaded).toBe(0);
  });

  it('成本高于阈值应走 Worker', async () => {
    const worker = createComputeWorker();
    const t = getDefaultTransport({ factory: () => worker });
    await t.init();

    const oldKeys = Array.from({ length: 600 }, (_, i) => i);
    const newKeys = Array.from({ length: 600 }, (_, i) => i);
    const result = await offload<number[]>('keyedSequenceDiff', [oldKeys, newKeys], {
      threshold: 100,
      transport: t,
    });

    expect(result).toHaveLength(600);
    expect(t.getStats().offloaded).toBe(1);
  });

  it('forceLocal 应强制本地', async () => {
    const worker = createComputeWorker();
    const t = getDefaultTransport({ factory: () => worker });
    await t.init();

    await offload('keyedSequenceDiff', [['a'], ['a']], { transport: t, forceLocal: true, threshold: 0 });
    expect(t.getStats().offloaded).toBe(0);
  });

  it('diffKeyedSequence 应返回下标映射', async () => {
    const result = await diffKeyedSequence(['a', 'b'], ['b', 'c'], { threshold: 1000 });
    expect(result).toEqual([1, -1]);
  });
});

describe('Worker 运行时脚本', () => {
  it('生成脚本应同时兼容 Web Worker 与 Node worker_threads', () => {
    const script = buildWorkerScript();
    expect(script).toContain("msg.type === 'init'");
    expect(script).toContain("msg.type === 'compute'");
    expect(script).toContain("msg.type === 'cancel'");
    expect(script).toContain('postMessage');
    // 双环境适配：浏览器 self / Node parentPort
    expect(script).toContain('worker_threads');
    expect(script).toContain('parentPort');
  });

  it('生成脚本应为合法 JS（可构造）', () => {
    expect(() => new Function(buildWorkerScript())).not.toThrow();
  });
});
