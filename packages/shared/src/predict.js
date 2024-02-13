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
    // 规则 1: 从未更新过的节点 - 检查静态哈希
    if (fingerprint.updateCount === 0) {
        const currentHash = fastHash(currentData);
        return currentHash === fingerprint.lastContentHash;
    }
    // 规则 2: 高频更新节点 - 不跳过
    const decayScore = computeDecayScore(fingerprint, now);
    if (decayScore > FINGERPRINT_CONFIG.HOT_THRESHOLD) {
        return false;
    }
    // 规则 3: 内容哈希命中 - O(1) 比对
    const currentHash = fastHash(currentData);
    if (fingerprint.hashHistory.includes(currentHash)) {
        fingerprint.skipConfidence = Math.min(FINGERPRINT_CONFIG.MAX_CONFIDENCE, fingerprint.skipConfidence + FINGERPRINT_CONFIG.CONFIDENCE_STEP_UP);
        fingerprint.consecutiveHits++;
        return true;
    }
    // 规则 4: 时序衰减判断
    const timeSinceLastUpdate = now - fingerprint.lastUpdateTime;
    if (timeSinceLastUpdate > FINGERPRINT_CONFIG.COOL_DOWN_MS) {
        fingerprint.skipConfidence = Math.min(FINGERPRINT_CONFIG.MAX_CONFIDENCE, fingerprint.skipConfidence + FINGERPRINT_CONFIG.CONFIDENCE_STEP_COOL);
        return fingerprint.skipConfidence > FINGERPRINT_CONFIG.SKIP_THRESHOLD;
    }
    // 默认不跳过，置信度衰减
    fingerprint.skipConfidence = Math.max(FINGERPRINT_CONFIG.MIN_CONFIDENCE, fingerprint.skipConfidence - FINGERPRINT_CONFIG.CONFIDENCE_STEP_DOWN);
    fingerprint.consecutiveHits = 0;
    return false;
}
/** 记录误跳过 (预测层发现跳过了但实际需要更新) */
export function recordFalseSkip(fingerprint) {
    fingerprint.falseSkipCount++;
    fingerprint.consecutiveSkips = 0;
    fingerprint.skipConfidence = Math.max(FINGERPRINT_CONFIG.MIN_CONFIDENCE, fingerprint.skipConfidence - FINGERPRINT_CONFIG.CONFIDENCE_STEP_DOWN * 2);
}
/** 记录正确跳过 */
export function recordCorrectSkip(fingerprint) {
    fingerprint.consecutiveSkips++;
}
/** 创建预测统计对象 */
export function createPredictionStats(init = {}) {
    const base = {
        skipTotal: 0,
        skipCorrect: 0,
        skipFalse: 0,
        passTotal: 0,
        passNoChange: 0,
        ...init,
    };
    return {
        ...base,
        accuracy() {
            return base.skipTotal > 0 ? base.skipCorrect / base.skipTotal : 0;
        },
        recall() {
            const actualUpdates = base.skipFalse + base.passTotal;
            return actualUpdates > 0 ? base.passTotal / actualUpdates : 0;
        },
        f1() {
            const p = this.accuracy();
            const r = this.recall();
            return (p + r) > 0 ? 2 * p * r / (p + r) : 0;
        },
        skipRate() {
            const total = base.skipTotal + base.passTotal;
            return total > 0 ? base.skipTotal / total : 0;
        },
    };
}
/** 默认自适应配置 */
export const DEFAULT_ADAPTIVE_CONFIG = {
    targetAccuracy: 0.95,
    adjustmentStep: 0.02,
    minSkipThreshold: 0.7,
    maxSkipThreshold: 0.99,
    windowSize: 100,
};
/** 创建自适应阈值调整器 */
export function createAdaptiveThreshold(config = {}) {
    const mergedConfig = { ...DEFAULT_ADAPTIVE_CONFIG, ...config };
    const recentStats = [];
    let currentThreshold = mergedConfig.minSkipThreshold;
    return {
        config: mergedConfig,
        currentThreshold,
        recentStats,
        recordStats(stats) {
            recentStats.push(stats);
            if (recentStats.length > mergedConfig.windowSize) {
                recentStats.shift();
            }
            // 计算窗口内平均准确率
            const avgAccuracy = recentStats.reduce((sum, s) => sum + s.accuracy(), 0) / recentStats.length;
            // 自适应调整
            if (avgAccuracy < mergedConfig.targetAccuracy - 0.05) {
                // 准确率太低，降低阈值 (更保守)
                currentThreshold = Math.max(mergedConfig.minSkipThreshold, currentThreshold - mergedConfig.adjustmentStep);
            }
            else if (avgAccuracy > mergedConfig.targetAccuracy + 0.02) {
                // 准确率很高，提高阈值 (更激进)
                currentThreshold = Math.min(mergedConfig.maxSkipThreshold, currentThreshold + mergedConfig.adjustmentStep);
            }
            return currentThreshold;
        },
        getThreshold() {
            return currentThreshold;
        },
        reset() {
            recentStats.length = 0;
            currentThreshold = mergedConfig.minSkipThreshold;
