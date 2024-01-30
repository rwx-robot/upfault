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