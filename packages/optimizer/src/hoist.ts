/**
 * 静态子树提升分析
 *
 * 完全静态的子树（无插值、无动态绑定、无控制流、非组件）在渲染函数中
 * 只需创建一次；优化器在此打上 `hoisted` 标记与子树规模，供 codegen 决策。
 */

import type { TemplateNode } from '@upfault/compiler';
import { isStaticNode } from './dce';
import type { OptimizeStats, OptimizedNode } from './types';

export interface HoistOptions {
  hoistMinNodes: number;
}

/**
 * 标记可提升的静态子树。返回新节点数组（节点对象浅拷贝 + 标记）。
 */
export function markStaticHoisting(
  nodes: readonly TemplateNode[],
  opts: HoistOptions,
  stats: OptimizeStats,
): OptimizedNode[] {
  return nodes.map((node) => visit(node, opts, stats));
}

function visit(node: TemplateNode, opts: HoistOptions, stats: OptimizeStats): OptimizedNode {
  // 整棵子树静态且规模达标 → 整体提升，不再深入
  if (isStaticNode(node)) {
    const size = countSubtree(node);
    if (size >= opts.hoistMinNodes) {
      stats.hoistedSubtrees++;
      return { ...node, hoisted: true, hoistSize: size } as OptimizedNode;
    }
    return node as OptimizedNode;
  }

  switch (node.type) {
    case 'Element':
    case 'Component':
      return {
        ...(node as Extract<TemplateNode, { type: 'Element' }>),
        children: markStaticHoisting(node.children, opts, stats),
      } as OptimizedNode;

    case 'For':
      return {
        ...(node as Extract<TemplateNode, { type: 'For' }>),
        children: markStaticHoisting(node.children, opts, stats),
      } as OptimizedNode;

    case 'Slot':
      return {
        ...(node as Extract<TemplateNode, { type: 'Slot' }>),
        fallback: markStaticHoisting(node.fallback, opts, stats),
      } as OptimizedNode;

    case 'If': {
      const ifNode = node as Extract<TemplateNode, { type: 'If' }>;
      return {
        ...ifNode,
        branches: ifNode.branches.map((b) => ({
          ...b,
          children: markStaticHoisting(b.children, opts, stats),
        })),
      } as OptimizedNode;
    }

    default:
      return node as OptimizedNode;
  }
}

function countSubtree(node: TemplateNode): number {
  let total = 1;
  if (node.type === 'Element' || node.type === 'Component') {
    for (const c of node.children) total += countSubtree(c);
  } else if (node.type === 'For') {
    for (const c of node.children) total += countSubtree(c);
  } else if (node.type === 'Slot') {
    for (const c of node.fallback) total += countSubtree(c);
  } else if (node.type === 'If') {
    for (const b of node.branches) for (const c of b.children) total += countSubtree(c);
  }
  return total;
}
