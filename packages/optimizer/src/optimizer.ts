/**
 * @upfault/optimizer - 编译时优化器主流程
 *
 * 位置：parse → **optimize** → buildBlockTree → codegen
 *
 * Pass 顺序（顺序有意为之）：
 * 1. 常量折叠  —— 把可求值的插值退化为静态文本，为后续消除创造条件
 * 2. 死代码消除 —— 常量条件分支裁剪、注释/空白清理
 * 3. 文本合并  —— 折叠后可能出现相邻文本，合并减少 VNode
 * 4. 静态提升  —— 标记可提升子树，供 codegen 只生成一次
 */

import type { TemplateAST, TemplateNode } from '@upfault/compiler';
import { tryFoldExpression } from './constant-fold';
import { eliminateDeadCode, mergeAdjacentText, countNodes } from './dce';
import { markStaticHoisting } from './hoist';
import {
  DEFAULT_OPTIMIZE_OPTIONS,
  type OptimizeOptions,
  type OptimizeResult,
  type OptimizeStats,
} from './types';

function emptyStats(): OptimizeStats {
  return {
    nodesBefore: 0,
    nodesAfter: 0,
    removedNodes: 0,
    foldedConstants: 0,
    prunedBranches: 0,
    hoistedSubtrees: 0,
    mergedTextNodes: 0,
    timings: {},
  };
}

/**
 * 优化模板 AST。
 *
 * 语义保证：不可折叠的表达式、含变量的分支一律保持原样；
 * 优化只做“编译期已确定”的改写，绝不改变运行时语义。
 */
export function optimize(ast: TemplateAST, options: OptimizeOptions = {}): OptimizeResult {
  const opts = { ...DEFAULT_OPTIMIZE_OPTIONS, ...options };
  const stats = emptyStats();
  stats.nodesBefore = countNodes(ast.children);

  let nodes: readonly TemplateNode[] = ast.children;

  // Pass 1 + 2: 常量折叠与死代码消除（同一次遍历完成）
  if (opts.constantFolding || opts.deadCodeElimination || opts.production) {
    const t0 = now();
    nodes = eliminateDeadCode(nodes, {
      production: opts.production,
      constantFolding: opts.constantFolding,
    }, stats);
    stats.timings.foldAndDce = round(now() - t0);
  }

  // Pass 3: 合并相邻静态文本
  if (opts.mergeText) {
    const t0 = now();
    nodes = mergeAdjacentText(nodes, stats);
    stats.timings.mergeText = round(now() - t0);
  }

  // Pass 4: 静态子树提升标记
  if (opts.staticHoisting) {
    const t0 = now();
    nodes = markStaticHoisting(nodes, { hoistMinNodes: opts.hoistMinNodes }, stats);
    stats.timings.staticHoisting = round(now() - t0);
  }

  stats.nodesAfter = countNodes(nodes);
  stats.removedNodes = Math.max(0, stats.nodesBefore - stats.nodesAfter);

  return {
    ast: { ...ast, children: [...nodes] },
    stats,
  };
}

/** 便捷：只做常量折叠（供测试与工具使用） */
export function foldExpression(expr: string): string | number | boolean | null {
  const r = tryFoldExpression(expr);
  return r.folded ? r.value : null;
}

function now(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}
