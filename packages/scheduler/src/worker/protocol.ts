/**
 * Worker 协作消息协议
 *
 * 主线程 ⇄ Worker 之间只传输**可结构化克隆的数据**：
 * 函数名（字符串）+ 参数数组（JSON 安全值）。函数实现本身不通过消息传递，
 * 而是在 Worker 启动时由主线程注入的注册表源码重建（见 compute-registry.ts）。
 */

/** 主线程 → Worker */
export type WorkerRequest =
  | { type: 'init'; registry: RegistryPayload }
  | { type: 'compute'; id: number; name: string; args: unknown[] }
  | { type: 'cancel'; id: number };

/** Worker → 主线程 */
export type WorkerResponse =
  | { type: 'ready' }
  | { type: 'result'; id: number; value: unknown; duration: number }
  | { type: 'error'; id: number; message: string }
  | { type: 'cancelled'; id: number };

/** 注入 Worker 的函数表（源码形式，Worker 内重建） */
export interface RegistryPayload {
  /** 函数名 → 函数源码（必须是自包含的纯函数，不得依赖闭包） */
  sources: Record<string, string>;
}

export const PROTOCOL_VERSION = 1;

/** 生成 Worker 侧的运行时脚本（纯字符串，可 Blob 化） */
export function buildWorkerScript(): string {
  return `
// @upfault/scheduler — Worker runtime (生成代码，勿手工编辑)
// 同时兼容 Web Worker(self) 与 Node worker_threads(parentPort)
var REGISTRY = Object.create(null);
var VERSION = ${PROTOCOL_VERSION};

var isNode = (typeof self === 'undefined') && (typeof require === 'function');
var ctx = isNode ? require('worker_threads').parentPort : self;

function post(msg) { ctx.postMessage(msg); }

function onMessage(handler) {
  if (isNode) {
    ctx.on('message', function (data) { handler(data); });
  } else {
    ctx.onmessage = function (event) { handler(event.data); };
  }
}

onMessage(function (msg) {
  if (!msg || typeof msg.type !== 'string') return;

  if (msg.type === 'init') {
    var sources = (msg.registry && msg.registry.sources) || {};
    for (var name in sources) {
      if (!Object.prototype.hasOwnProperty.call(sources, name)) continue;
      try {
        // 注册表源码由应用注册，要求为自包含纯函数
        REGISTRY[name] = new Function('return (' + sources[name] + ')')();
      } catch (e) {
        post({ type: 'error', id: -1, message: 'registry init failed for ' + name + ': ' + e.message });
      }
    }
    post({ type: 'ready' });
    return;
  }

  if (msg.type === 'compute') {
    var fn = REGISTRY[msg.name];
    if (typeof fn !== 'function') {
      post({ type: 'error', id: msg.id, message: 'unknown compute function: ' + msg.name });
      return;
    }
    var started = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    try {
      var value = fn.apply(null, msg.args || []);
      var ended = (typeof performance !== 'undefined' ? performance.now() : Date.now());
      post({ type: 'result', id: msg.id, value: value, duration: ended - started });
    } catch (e) {
      post({ type: 'error', id: msg.id, message: (e && e.message) || String(e) });
    }
    return;
  }

  if (msg.type === 'cancel') {
    // 计算已同步执行，取消仅作通知（主线程侧按 id 丢弃结果）
    post({ type: 'cancelled', id: msg.id });
    return;
  }
});
`.trim();
}
