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
  TEXT: 1,
  ELEMENT: 2,
  COMPONENT: 3,
  BLOCK: 4,
  FRAGMENT: 5,
  COMMENT: 6,
  TELEPORT: 7,
  SUSPENSE: 8,
  KEEPALIVE: 9,
} as const;

// Also export individual values for better tree-shaking and inlining
export const VNodeType_TEXT = 1;
export const VNodeType_ELEMENT = 2;
export const VNodeType_COMPONENT = 3;
export const VNodeType_BLOCK = 4;
