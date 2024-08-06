/**
 * UpFault Predict Cache - 预测缓存层
 * 
 * LFU + 时序衰减启发式，O(1) 跳过决策
 * 每节点 24 字节内存占用
 */

export interface UpdateFingerprint {
  /** 历史更新次数 */
  updateCount: number;
  
  /** 上次更新时间戳 (ms) */
  lastUpdateTime: number;
  
  /** 时序衰减得分 */
  decayScore: number;
  
  /** 最近 N 次内容哈希 (环形缓冲区) */
  hashHistory: number[];
  
  /** 哈希历史写入指针 */
  hashHistoryPtr: number;
  
  /** 跳过置信度 [0, 1] */
  skipConfidence: number;
  
  /** 最后一次内容哈希 */
  lastContentHash: number;
  
  /** 连续跳过次数 */
  consecutiveSkips: number;
  
  /** 连续命中次数 */
  consecutiveHits: number;
  
  /** 误跳过次数 (应更新但跳过了) */
  falseSkipCount: number;
}

/** 指纹配置常量 */
export const FINGERPRINT_CONFIG = {
  /** 哈希历史长度 */
  HASH_HISTORY_LENGTH: 8,
  
  /** 热点阈值 - 超过此分数不跳过 */
  HOT_THRESHOLD: 0.7,
  
  /** 冷却时间 (ms) - 超过此时间未更新视为冷节点 */
  COOL_DOWN_MS: 5_000,
  
  /** 衰减常数 λ */
  DECAY_LAMBDA: 0.001,
  
  /** 置信度增长步长 (命中时) */
  CONFIDENCE_STEP_UP: 0.1,
  
  /** 置信度增长步长 (冷却时) */
  CONFIDENCE_STEP_COOL: 0.05,
  
  /** 置信度衰减步长 (未命中时) */
  CONFIDENCE_STEP_DOWN: 0.2,
  
  /** 跳过决策阈值 */
  SKIP_THRESHOLD: 0.9,
  
  /** 最大置信度 */
  MAX_CONFIDENCE: 1.0,
  
  /** 最小置信度 */
  MIN_CONFIDENCE: 0.0,
};

/** 创建初始指纹 */
export function createFingerprint(): UpdateFingerprint {
  return {
    updateCount: 0,
    lastUpdateTime: 0,
    decayScore: 0,
    hashHistory: new Array(FINGERPRINT_CONFIG.HASH_HISTORY_LENGTH).fill(0),
    hashHistoryPtr: 0,
    skipConfidence: 0,
    lastContentHash: 0,
    consecutiveSkips: 0,
    consecutiveHits: 0,
    falseSkipCount: 0,
  };
}

/** 计算衰减分数 */
export function computeDecayScore(fingerprint: UpdateFingerprint, now: number = performance.now()): number {
  const timeSinceLastUpdate = now - fingerprint.lastUpdateTime;
  if (timeSinceLastUpdate <= 0) return fingerprint.decayScore;
  
  // decayScore = updateCount * e^(-λ * Δt)
  return fingerprint.updateCount * Math.exp(-FINGERPRINT_CONFIG.DECAY_LAMBDA * timeSinceLastUpdate);
}

/** 更新指纹 (节点实际更新时调用) */
export function updateFingerprint(
  fingerprint: UpdateFingerprint,
  contentHash: number,
  now: number = performance.now()
): void {
  fingerprint.updateCount++;
  fingerprint.lastUpdateTime = now;
  fingerprint.decayScore = computeDecayScore(fingerprint, now);
  fingerprint.lastContentHash = contentHash;
  
  // 记录哈希历史
  fingerprint.hashHistory[fingerprint.hashHistoryPtr] = contentHash;
  fingerprint.hashHistoryPtr = (fingerprint.hashHistoryPtr + 1) % FINGERPRINT_CONFIG.HASH_HISTORY_LENGTH;
  
  // 重置连续跳过
  fingerprint.consecutiveSkips = 0;
  
  // 置信度衰减 (更新发生 = 不应跳过)
  fingerprint.skipConfidence = Math.max(
    FINGERPRINT_CONFIG.MIN_CONFIDENCE,
    fingerprint.skipConfidence - FINGERPRINT_CONFIG.CONFIDENCE_STEP_DOWN
  );
}

/** 判断是否应跳过 Diff */
export function shouldSkip(
  fingerprint: UpdateFingerprint,
  currentData: unknown,
  fastHash: (data: unknown) => number,
  now: number = performance.now()
): boolean {
  // 规则 1: 从未更新过的节点 - 检查静态哈希
  if (fingerprint.updateCount === 0) {
    const currentHash = fastHash(currentData);
    return currentHash === fingerprint.lastContentHash;