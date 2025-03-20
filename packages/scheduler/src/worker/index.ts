/**
 * @upfault/scheduler · Worker 协作层（v0.3 M1）
 *
 * 目标：把可卸载的纯计算（列表比对、排序、哈希等）移入 Worker，
 *      主线程只负责派发与 DOM 提交 —— 验收指标：主线程阻塞 < 5ms。
 *
 * 设计要点：
 * - 只传「函数名 + 可序列化参数」，函数实现由注册表源码在 Worker 内重建
 * - 三条降级路径（不可用 / 超时 / 背压）保证任何环境下结果正确且 API 一致
 * - 传输层暴露 mainThreadDispatchMs 用于量化主线程占用
 */

export {
  WorkerTransport,
  defaultWorkerFactory,
  nodeWorkerFactory,
  type WorkerLike,
  type WorkerFactory,
  type WorkerTransportOptions,
  type TransportStats,
} from './transport';

export {
  computeRegistry,
  registerBuiltinComputes,
  keyedSequenceDiff,
  stableSortBy,
  chunkHash,
  type ComputeFn,
  type ComputeRegistry,
} from './compute-registry';

export {
  offload,
  offloadSync,
  diffKeyedSequence,
  getDefaultTransport,
  resetDefaultTransport,
  type OffloadOptions,
} from './offload';

export {
  buildWorkerScript,
  PROTOCOL_VERSION,
  type WorkerRequest,
  type WorkerResponse,
  type RegistryPayload,
} from './protocol';
