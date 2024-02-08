/**
 * UpFault Predict Cache Types - 预测缓存层核心类型
 *
 * LFU + 时序衰减启发式，O(1) 跳过决策
 * 每节点 24 字节内存占用
 */
/** 指纹配置常量 */
export const FINGERPRINT_CONFIG = {
    /** 哈希历史长度 */
    HASH_HISTORY_LENGTH: 8,
    /** 热点阈值 - 超过此分数不跳过 */
    HOT_THRESHOLD: 0.7,
    /** 冷却时间 (ms) - 超过此时间未更新视为冷节点 */
    COOL_DOWN_MS: 5000,
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
export function createFingerprint() {
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
export function computeDecayScore(fingerprint, now = performance.now()) {
    const timeSinceLastUpdate = now - fingerprint.lastUpdateTime;
    if (timeSinceLastUpdate <= 0)
        return fingerprint.decayScore;
    // decayScore = updateCount * e^(-λ * Δt)
    return fingerprint.updateCount * Math.exp(-FINGERPRINT_CONFIG.DECAY_LAMBDA * timeSinceLastUpdate);
}
/** 更新指纹 (节点实际更新时调用) */
export function updateFingerprint(fingerprint, contentHash, now = performance.now()) {
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
    fingerprint.skipConfidence = Math.max(FINGERPRINT_CONFIG.MIN_CONFIDENCE, fingerprint.skipConfidence - FINGERPRINT_CONFIG.CONFIDENCE_STEP_DOWN);
}
/** 判断是否应跳过 Diff */
export function shouldSkip(fingerprint, currentData, fastHash, now = performance.now()) {
