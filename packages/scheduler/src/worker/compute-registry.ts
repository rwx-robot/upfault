/**
 * 可卸载纯函数注册表
 *
 * 约束（硬性）：注册的函数必须是**自包含的纯函数** ——
 * 不得引用外部作用域变量（闭包）、不得触碰 DOM、不得有副作用。
 * 原因：Worker 侧通过函数源码重建实现，闭包上下文无法传递。
 */

export type ComputeFn = (...args: any[]) => unknown;

export interface ComputeRegistry {
  /** 注册一个可卸载的纯函数 */
  register(name: string, fn: ComputeFn): void;
  /** 注销 */
  unregister(name: string): boolean;
  /** 是否已注册 */
  has(name: string): boolean;
  /** 取函数 */
  get(name: string): ComputeFn | undefined;
  /** 全部已注册名 */
  names(): string[];
  /** 导出为可注入 Worker 的源码表 */
  toSources(): Record<string, string>;
  /** 清空（测试用） */
  clear(): void;
}

const store = new Map<string, ComputeFn>();

export const computeRegistry: ComputeRegistry = {
  register(name, fn) {
    if (typeof fn !== 'function') {
      throw new TypeError(`[computeRegistry] "${name}" 不是函数`);
    }
    store.set(name, fn);
  },

  unregister(name) {
    return store.delete(name);
  },

  has(name) {
    return store.has(name);
  },

  get(name) {
    return store.get(name);
  },

  names() {
    return Array.from(store.keys());
  },

  toSources() {
    const sources: Record<string, string> = {};
    for (const [name, fn] of store) {
      sources[name] = fn.toString();
    }
    return sources;
  },

  clear() {
    store.clear();
  },
};

/**
 * 内置可卸载计算：列表 diff 的“键序列比对”。
 * 这是主线程最容易卡顿的一类纯计算 —— 大规模列表更新时
 * 在 Worker 中完成，主线程只接收结果并提交 DOM。
 */
export function registerBuiltinComputes(): void {
  computeRegistry.register('keyedSequenceDiff', keyedSequenceDiff);
  computeRegistry.register('stableSortBy', stableSortBy);
  computeRegistry.register('chunkHash', chunkHash);
}

/**
 * 键序列比对（LIS 前的基础步骤）：
 * 输入新旧 key 数组，输出每个新 key 在旧数组中的下标（-1 表示新增）。
 * 纯函数，无闭包依赖。
 */
export function keyedSequenceDiff(oldKeys: unknown[], newKeys: unknown[]): number[] {
  const index = new Map<unknown, number>();
  for (let i = 0; i < oldKeys.length; i++) {
    const k = oldKeys[i];
    if (!index.has(k)) index.set(k, i);
  }
  const result: number[] = new Array(newKeys.length);
  for (let i = 0; i < newKeys.length; i++) {
    const pos = index.get(newKeys[i]);
    result[i] = pos === undefined ? -1 : pos;
  }
  return result;
}

/** 稳定排序（按 key 提取器），纯函数 */
export function stableSortBy(items: Array<Record<string, unknown>>, key: string): Array<Record<string, unknown>> {
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const av = a.item ? a.item[key] : undefined;
      const bv = b.item ? b.item[key] : undefined;
      if (av === bv) return a.index - b.index;
      // eslint-disable-next-line eqeqeq
      return (av as any) > (bv as any) ? 1 : -1;
    })
    .map((entry) => entry.item);
}

/** 分块哈希（用于大列表变更检测），纯函数 */
export function chunkHash(values: unknown[], chunkSize: number): number[] {
  const size = chunkSize > 0 ? chunkSize : 32;
  const out: number[] = [];
  for (let i = 0; i < values.length; i += size) {
    let hash = 0x811c9dc5;
    const end = Math.min(i + size, values.length);
    for (let j = i; j < end; j++) {
      const s = JSON.stringify(values[j]);
      for (let k = 0; k < s.length; k++) {
        hash ^= s.charCodeAt(k);
        hash = (hash * 0x01000193) >>> 0;
      }
    }
    out.push(hash >>> 0);
  }
  return out;
}
