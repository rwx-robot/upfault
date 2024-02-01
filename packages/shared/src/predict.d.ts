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