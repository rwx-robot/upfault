/**
 * UpFault Predict Cache - 预测缓存层
 * 
 * LFU + 时序衰减启发式，O(1) 跳过决策
 * 每节点 24 字节内存占用
 */

export interface UpdateFingerprint {
  /** 历史更新次数 */
