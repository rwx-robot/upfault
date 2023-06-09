/**
 * @upfault/diff - AeroDiff 双端扩散 Diff 算法
 * 
 * O(n) 线性时间复杂度的高性能 Diff
 * 版本: 0.2.0
 */

export {
  // Core Diff
  aeroDiff,
  
  // Block Diff
  blockDiff,
  diffBlockTree,
  
  // Patch Flags
  computePatchFlags,
  cloneWithPatchFlags,
  
  // Types (re-export from shared)
  DiffOpType,
  PatchFlags,
  VNodeType,
} from './core';

// Re-export types
export type { 
  VNode, 
  DiffOp, 
  DiffResult, 
  DiffStats, 
  DiffIndex, 