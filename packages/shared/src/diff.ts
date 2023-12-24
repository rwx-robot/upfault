/**
 * UpFault Diff Types - AeroDiff 核心算法类型
 * 
 * 双端扩散 + 类型位掩码 + Block 树
 * O(n) 线性时间复杂度
 */

import type { UpdateFingerprint } from './predict';
import type { Priority } from './scheduler';

/** VNode 类型 */
export const VNodeType = {
