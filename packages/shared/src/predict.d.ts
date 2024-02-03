/**
 * UpFault Predict Cache Types - 预测缓存层核心类型
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
export declare const FINGERPRINT_CONFIG: {
    /** 哈希历史长度 */
    HASH_HISTORY_LENGTH: number;
    /** 热点阈值 - 超过此分数不跳过 */
    HOT_THRESHOLD: number;
    /** 冷却时间 (ms) - 超过此时间未更新视为冷节点 */
    COOL_DOWN_MS: number;
    /** 衰减常数 λ */
    DECAY_LAMBDA: number;
    /** 置信度增长步长 (命中时) */
    CONFIDENCE_STEP_UP: number;
    /** 置信度增长步长 (冷却时) */
    CONFIDENCE_STEP_COOL: number;
    /** 置信度衰减步长 (未命中时) */
    CONFIDENCE_STEP_DOWN: number;
    /** 跳过决策阈值 */
    SKIP_THRESHOLD: number;
    /** 最大置信度 */
    MAX_CONFIDENCE: number;
    /** 最小置信度 */
    MIN_CONFIDENCE: number;
};
/** 创建初始指纹 */
export declare function createFingerprint(): UpdateFingerprint;
/** 计算衰减分数 */
export declare function computeDecayScore(fingerprint: UpdateFingerprint, now?: number): number;
/** 更新指纹 (节点实际更新时调用) */
export declare function updateFingerprint(fingerprint: UpdateFingerprint, contentHash: number, now?: number): void;
/** 判断是否应跳过 Diff */
export declare function shouldSkip(fingerprint: UpdateFingerprint, currentData: unknown, fastHash: (data: unknown) => number, now?: number): boolean;
/** 记录误跳过 (预测层发现跳过了但实际需要更新) */
export declare function recordFalseSkip(fingerprint: UpdateFingerprint): void;
/** 记录正确跳过 */
export declare function recordCorrectSkip(fingerprint: UpdateFingerprint): void;
/** 预测统计 */
export interface PredictionStats {
    /** 跳过总数 */
    skipTotal: number;
    /** 正确跳过数 */
    skipCorrect: number;
    /** 错误跳过数 (应更新但跳过) */
    skipFalse: number;
    /** 通过总数 (未跳过、实际更新) */
    passTotal: number;
    /** 通过但无变化数 (浪费计算) */
    passNoChange: number;
    /** 准确率 */
    accuracy(): number;
    /** 召回率 (实际更新中被正确识别的比例) */
    recall(): number;
    /** F1 分数 */
    f1(): number;
    /** 跳过率 */
    skipRate(): number;
}
/** 创建预测统计对象 */
export declare function createPredictionStats(init?: Partial<PredictionStats>): PredictionStats;
/** 自适应阈值配置 */
export interface AdaptiveThresholdConfig {
    /** 目标准确率 */
    targetAccuracy: number;
    /** 调整步长 */
    adjustmentStep: number;
    /** 最小跳过阈值 */
