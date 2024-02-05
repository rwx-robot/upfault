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