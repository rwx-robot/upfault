/**
 * @upfault/predict-cache - UpFault 预测缓存层
 * 
 * LFU + 时序衰减启发式，O(1) 跳过决策
 * 每节点 24 字节内存占用
 * 版本: 0.2.0
 */

// 核心类型
export type {
  UpdateFingerprint,
  PredictionStats,
  AdaptiveThresholdConfig,
  AdaptiveThreshold,
  FastHashFn,
} from './predict';

// 核心函数
export {
  FINGERPRINT_CONFIG,
  createFingerprint,
  computeDecayScore,
  updateFingerprint,
  shouldSkip,
  recordFalseSkip,
  recordCorrectSkip,
  createPredictionStats,
  DEFAULT_ADAPTIVE_CONFIG,
  createAdaptiveThreshold,
  defaultFastHash,
} from './predict';

// 版本信息
export const VERSION = '0.2.0';
export const PACKAGE_NAME = '@upfault/predict-cache';