/**
 * 死代码消除（DCE）与静态文本合并
 *
 * 消除目标：
 * 1. 生产模式下删除注释节点与纯空白文本节点
 * 2. 由常量条件决定的不可能分支（v-if / v-else）
 * 3. 空分支、空控制流节点
 * 4. 常真条件下的单分支展平（减少一层运行时判断）
 */

import type { TemplateNode, TextNode, InterpolationNode } from '@upfault/compiler';
import { tryFoldExpression, renderFoldedValue } from './constant-fold';
import type { OptimizeStats, OptimizedNode } from './types';

export interface DceOptions {
  production: boolean;
  constantFolding: boolean;
}

/**
 * 对节点数组执行 DCE。返回新数组，不修改输入。
 */
export function eliminateDeadCode(
  nodes: readonly TemplateNode[],
  opts: DceOptions,
  stats: OptimizeStats,
): TemplateNode[] {
  const out: TemplateNode[] = [];

  for (const node of nodes) {
    const kept = processNode(node, opts, stats);
    if (kept !== null) out.push(kept);
  }

  return out;
}

/** 返回 null 表示该节点被删除 */
function processNode(
  node: TemplateNode,
  opts: DceOptions,
  stats: OptimizeStats,
): TemplateNode | null {
  switch (node.type) {
    case 'Comment':
      if (opts.production) {
        stats.removedNodes++;
        return null;
      }
      return node;

    case 'Text': {
      const text = node as TextNode;
      // 纯空白文本（模板缩进/换行）在生产模式下无意义
      if (opts.production && text.content.trim() === '') {
        stats.removedNodes++;
        return null;
      }
      return node;
    }

    case 'Interpolation': {
      if (!opts.constantFolding) return node;
      const interp = node as InterpolationNode;
      const folded = tryFoldExpression(interp.expression);
      if (!folded.folded) return node;

      // 值已在编译期确定 → 退化为静态文本，运行时无需插值
      stats.foldedConstants++;
      return {
        type: 'Text',
        content: renderFoldedValue(folded.value),
        loc: interp.loc,
      } as TextNode;
    }

    case 'If':
      return processIf(node, opts, stats);

    case 'For': {
      const forNode = node as Extract<TemplateNode, { type: 'For' }>;
      const children = eliminateDeadCode(forNode.children, opts, stats);
      return { ...forNode, children };
    }

    case 'Element':
    case 'Component': {
      const el = node as Extract<TemplateNode, { type: 'Element' }>;
      const children = eliminateDeadCode(el.children, opts, stats);
      return { ...el, children };
    }

    case 'Slot': {
      const slot = node as Extract<TemplateNode, { type: 'Slot' }>;
      const fallback = eliminateDeadCode(slot.fallback, opts, stats);
      return { ...slot, fallback };
    }

    default:
      return node;
  }
}

function processIf(
  node: Extract<TemplateNode, { type: 'If' }>,
  opts: DceOptions,
  stats: OptimizeStats,
): TemplateNode | null {
  // 先递归优化各分支内部
  const optimizedBranches = node.branches.map((branch) => ({
    ...branch,
    children: eliminateDeadCode(branch.children, opts, stats),
  }));

  const kept: typeof optimizedBranches = [];
  let determinedTrue = false; // 已确定命中某分支 → 后续分支全部不可达

  for (const branch of optimizedBranches) {
    // 空分支：无任何子节点 → 删除。
    // 不计入 prunedBranches —— 它并非由常量条件裁剪，
    // 而是 parser 预置的空 else 占位（避免污染“条件裁剪”这一验收指标）
    if (branch.children.length === 0) {
      stats.removedNodes++;
      continue;
    }

    if (determinedTrue) {
      stats.prunedBranches++;
      continue;
    }

    // condition === null 表示 v-else
    if (branch.condition === null) {
      kept.push(branch);
      continue;
    }

    if (opts.constantFolding) {
      const folded = tryFoldExpression(branch.condition);
      if (folded.folded) {
        if (truthy(folded.value)) {
          kept.push(branch);
          determinedTrue = true; // 后续分支（含 else）不可达
          continue;
        }
        // 常量假 → 本分支不可达
        stats.prunedBranches++;
        continue;
      }
    }

    kept.push(branch);
  }

  if (kept.length === 0) {
    // 整个 v-if 结构都被裁剪
    stats.removedNodes++;
    return null;
  }

  // 单分支且条件为常量真 → 展平，去掉运行时判断
  if (kept.length === 1) {
    const only = kept[0]!;
    if (only.condition !== null) {
      const folded = tryFoldExpression(only.condition);
      if (folded.folded && truthy(folded.value)) {
        return {
          type: 'Element',
          tag: 'template',
          props: [],
          children: only.children,
          isSelfClosing: false,
          isComponent: false,
          loc: node.loc,
        } as Extract<TemplateNode, { type: 'Element' }>;
      }
    }
    // 单分支 v-else：等价于其子节点
    if (only.condition === null) {
      return {
        type: 'Element',
        tag: 'template',
        props: [],
        children: only.children,
        isSelfClosing: false,
        isComponent: false,
        loc: node.loc,
      } as Extract<TemplateNode, { type: 'Element' }>;
    }
  }

  return { ...node, branches: kept };
}

function truthy(value: string | number | boolean): boolean {
  return Boolean(value);
}

/**
 * 合并相邻静态文本节点。
 * `a{{x}}b` 中的插值不可合并，但 `a` + `b` 相邻文本可合为一个，
 * 直接减少 VNode 数量。
 */
export function mergeAdjacentText(nodes: readonly TemplateNode[], stats: OptimizeStats): TemplateNode[] {
  const out: TemplateNode[] = [];

  for (const node of nodes) {
    const prev = out[out.length - 1];
    if (
      node.type === 'Text' &&
      prev &&
      prev.type === 'Text' &&
      prev.loc.source !== undefined // 保持结构完整
    ) {
      prev.content += (node as TextNode).content;
      prev.loc = {
        ...prev.loc,
        source: prev.loc.source + (node as TextNode).content,
      };
      stats.mergedTextNodes++;
      continue;
    }

    // 递归子节点
    out.push(mergeTextChildren(node, stats));
  }

  return out;
}

function mergeTextChildren(node: TemplateNode, stats: OptimizeStats): TemplateNode {
  switch (node.type) {
    case 'Element':
    case 'Component': {
      const el = node as Extract<TemplateNode, { type: 'Element' }>;
      return { ...el, children: mergeAdjacentText(el.children, stats) };
    }
    case 'For': {
      const f = node as Extract<TemplateNode, { type: 'For' }>;
      return { ...f, children: mergeAdjacentText(f.children, stats) };
    }
    case 'Slot': {
      const s = node as Extract<TemplateNode, { type: 'Slot' }>;
      return { ...s, fallback: mergeAdjacentText(s.fallback, stats) };
    }
    case 'If': {
      const i = node as Extract<TemplateNode, { type: 'If' }>;
      return {
        ...i,
        branches: i.branches.map((b) => ({ ...b, children: mergeAdjacentText(b.children, stats) })),
      };
    }
    default:
      return node;
  }
}

/** 统计 AST 节点总数（含所有后代） */
export function countNodes(nodes: readonly TemplateNode[]): number {
  let total = 0;
  for (const node of nodes) {
    total += 1;
    if (node.type === 'Element' || node.type === 'Component') {
      total += countNodes(node.children);
    } else if (node.type === 'For') {
      total += countNodes(node.children);
    } else if (node.type === 'Slot') {
      total += countNodes(node.fallback);
    } else if (node.type === 'If') {
      for (const b of node.branches) total += countNodes(b.children);
    }
  }
  return total;
}

/** 节点是否完全静态（无插值、无动态绑定、无控制流） */
export function isStaticNode(node: TemplateNode): boolean {
  switch (node.type) {
    case 'Text':
    case 'Comment':
      return true;
    case 'Interpolation':
      return false;
    case 'Element': {
      if (node.props.some((p) => p.isDynamic || p.isEvent || p.isDirective)) return false;
      return node.children.every(isStaticNode);
    }
    case 'Component':
      // 组件可能持有内部状态，不视为静态
      return false;
    case 'If':
    case 'For':
    case 'Slot':
      return false;
    default:
      return false;
  }
}
