/**
 * @upfault/diff - AeroDiff 双端扩散 Diff 算法
 *
 * O(n) 线性时间复杂度的高性能 Diff
 * 版本: 0.2.0
 */
export { aeroDiff, blockDiff, diffBlockTree, computePatchFlags, cloneWithPatchFlags, DiffOpType, PatchFlags, VNodeType, } from './core';
export type { VNode, DiffOp, DiffResult, DiffStats, DiffIndex, AeroDiffOptions, Block } from '@upfault/shared';
export declare const VERSION = "0.2.0";