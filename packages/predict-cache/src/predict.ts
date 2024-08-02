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