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
