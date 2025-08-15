/**
 * @upfault/optimizer - 编译时优化器类型
 *
 * 优化器工作在 TemplateAST 层（parser 产出 → buildBlockTree/codegen 之前），
 * 通过常量折叠、死代码消除、静态提升等手段减少运行时开销与产物体积。
 */

import type { TemplateAST, TemplateNode } from '@upfault/compiler';

/** 优化开关 */
export interface OptimizeOptions {
  /** 生产模式：删除注释节点与纯空白文本节点（默认 true） */
  production?: boolean;
  /** 常量折叠：编译期求值常量表达式（默认 true） */
  constantFolding?: boolean;
  /** 死代码消除：裁剪常量条件决定的不可能分支（默认 true） */
  deadCodeElimination?: boolean;
  /** 静态子树提升：标记可提升的静态子树（默认 true） */
  staticHoisting?: boolean;
  /** 合并相邻静态文本节点（默认 true） */
  mergeText?: boolean;
  /** 提升阈值：子树节点数 >= 该值才标记提升（默认 2） */
  hoistMinNodes?: number;
}

/** 优化统计（用于验收：节点数、体积压缩比） */
export interface OptimizeStats {
  /** 优化前节点总数 */
  nodesBefore: number;
  /** 优化后节点总数 */
  nodesAfter: number;
  /** 被删除的节点数 */
  removedNodes: number;
  /** 被折叠的常量表达式数 */
  foldedConstants: number;
  /** 被裁剪的分支数 */
  prunedBranches: number;
  /** 被标记为可提升的静态子树数 */
  hoistedSubtrees: number;
  /** 被合并掉的文本节点数 */
  mergedTextNodes: number;
  /** 各 pass 耗时 (ms) */
  timings: Record<string, number>;
}

export interface OptimizeResult {
  ast: TemplateAST;
  stats: OptimizeStats;
}

/** 折叠结果 */
export type FoldResult =
  | { folded: true; value: string | number | boolean }
  | { folded: false };

/**
 * 带提升标记的节点。
 * 优化器不修改 compiler 的节点结构，仅附加 `hoisted` 标记供 codegen 消费。
 */
export type OptimizedNode = TemplateNode & {
  hoisted?: boolean;
  /** 静态子树包含的节点数（仅根标记，便于 codegen 决策） */
  hoistSize?: number;
};

export const DEFAULT_OPTIMIZE_OPTIONS: Required<OptimizeOptions> = {
  production: true,
  constantFolding: true,
  deadCodeElimination: true,
  staticHoisting: true,
  mergeText: true,
  hoistMinNodes: 2,
};
