/**
 * AeroDiff Core - 双端扩散 Diff 算法
 * 
 * 核心思想：
 * 1. 双端预处理：从头尾跳过相同节点 O(k)
 * 2. 建立索引：Key Map + Type Map O(n)
 * 3. 贪心匹配：优先 Key 精确匹配，回退 Type+Shape 匹配 O(m)
 * 4. 清理未使用节点 O(n-k)
 * 总复杂度：O(n)
 * 
 * 设计参考：Vue 3 双端 Diff + React Fiber 优先级 + 自研 Type 兜底
 */

import { 
  VNode, 
  VNodeType, 
  DiffOp, 
  DiffResult, 
  DiffStats, 
  DiffOpType,
  DiffIndex,
  AeroDiffOptions,
  DEFAULT_AERODIFF_OPTIONS,
  PatchFlags,
  Block 
} from '@upfault/shared';

import { defaultFastHash, isSameNode } from '@upfault/shared';

// ============================================================================
// 类型扩展（用于 Diff 算法内部标记）
// ============================================================================

interface VNodeWithUsed extends VNode {
  _used?: boolean;
}

interface BlockWithChildren extends Block {
  children: BlockWithChildren[];
}

type VNodeLike = { type: unknown; key: string | number | null };

// ============================================================================
// 核心 Diff 算法
// ============================================================================

/**
 * AeroDiff 主入口 - 双端扩散算法
 * 
 * @param oldChildren 旧子节点数组
 * @param newChildren 新子节点数组
 * @param options 算法配置
 * @returns DiffResult 包含操作序列和统计信息
 */
export function aeroDiff(
  oldChildren: VNode[], 
  newChildren: VNode[], 
  options: Partial<AeroDiffOptions> = {}
): DiffResult {
  const config = { ...DEFAULT_AERODIFF_OPTIONS, ...options };
  const timer = { start: performance.now() };
  
  const oldLen = oldChildren.length;
  const newLen = newChildren.length;
  
  // 统计信息
  const stats: DiffStats = {
    oldCount: oldLen,
    newCount: newLen,
    reusedCount: 0,
    createdCount: 0,
    deletedCount: 0,
    movedCount: 0,
    duration: 0,
  };
  
  const ops: DiffOp[] = [];
  
  // Cast to extended type for _used marker
  const oldChildrenExt = oldChildren as VNodeWithUsed[];
  const newChildrenExt = newChildren as VNodeWithUsed[];
  
  // ===== 第一阶段：双端预处理 =====
  let oldStart = 0;
  let oldEnd = oldLen - 1;
  let newStart = 0;
  let newEnd = newLen - 1;
  
  // 从头部向后跳过相同节点
  while (oldStart <= oldEnd && newStart <= newEnd) {
    const oldNode = oldChildrenExt[oldStart]!;
    const newNode = newChildrenExt[newStart]!;
    
    if (!isSameNode(oldNode, newNode)) break;
    
    // 节点相同，生成 UPDATE 操作
    ops.push({
      type: DiffOpType.UPDATE,
      oldNode,
      newNode,
      fromIndex: oldStart,
      toIndex: newStart,
    });
    stats.reusedCount++;
    oldStart++;
    newStart++;
  }
  
  // 从尾部向前跳过相同节点
  while (oldStart <= oldEnd && newStart <= newEnd) {
    const oldNode = oldChildrenExt[oldEnd]!;
    const newNode = newChildrenExt[newEnd]!;
    
    if (!isSameNode(oldNode, newNode)) break;
    
    ops.push({
      type: DiffOpType.UPDATE,
      oldNode,
      newNode,
      fromIndex: oldEnd,
      toIndex: newEnd,
    });
    stats.reusedCount++;
    oldEnd--;
    newEnd--;
  }
  
  // ===== 第二阶段：处理中间未知序列 =====
  // 如果旧节点已耗尽，剩余新节点全是 INSERT
  if (oldStart > oldEnd) {
    while (newStart <= newEnd) {
      ops.push({
        type: DiffOpType.CREATE,
        newNode: newChildrenExt[newStart]!,
        toIndex: newStart,
      });
      stats.createdCount++;
      newStart++;
    }
    const hasChanges = stats.createdCount > 0 || stats.deletedCount > 0 || stats.movedCount > 0;
    stats.duration = performance.now() - timer.start;
    return { ops, changed: hasChanges, stats };
  }
  
  // 如果新节点已耗尽，剩余旧节点全是 REMOVE
  if (newStart > newEnd) {
    while (oldStart <= oldEnd) {
      ops.push({
        type: DiffOpType.REMOVE,
        oldNode: oldChildrenExt[oldStart]!,
        fromIndex: oldStart,
      });
      stats.deletedCount++;
      oldStart++;
    }
    const hasChanges = stats.createdCount > 0 || stats.deletedCount > 0 || stats.movedCount > 0;
    stats.duration = performance.now() - timer.start;
    return { ops, changed: hasChanges, stats };
  }
  
  // ===== 第三阶段：建立索引并贪心匹配 =====
  const index = buildDiffIndex(oldChildrenExt, oldStart, oldEnd);
  const moves = performGreedyMatch(
    oldChildrenExt, 
    newChildrenExt, 
    newStart, 
    newEnd, 
    index, 
    ops, 
    stats,
    config
  );
  
  stats.movedCount = moves;
  
  // ===== 第四阶段：清理未使用的旧节点 =====
  cleanupUnusedOldNodes(
    oldChildrenExt, 
    oldStart, 
    oldEnd, 
    ops, 
    stats
  );
  
  stats.duration = performance.now() - timer.start;
  return { ops, changed: ops.length > 0, stats };
}

/**
 * 构建双索引：Key Map + Type Map
 */
function buildDiffIndex(
  oldChildren: VNodeWithUsed[], 
  start: number, 
  end: number
): DiffIndex {
  const keyMap = new Map<string | number, number>();
  const typeMap = new Map<VNodeType, number[]>();
  
  for (let i = start; i <= end; i++) {
    const node = oldChildren[i]!;
    
    // Key 索引
    if (node.key != null) {
      keyMap.set(node.key, i);
    }
    
    // Type 索引
    const typeList = typeMap.get(node.type) || [];
    typeList.push(i);
    typeMap.set(node.type, typeList);
  }
  
  return {
    keyMap,
    typeMap,
    oldNodes: oldChildren,
    start,
    end,
  };
}

/**
 * 贪心匹配：优先 Key 匹配，回退 Type 匹配
 */
function performGreedyMatch(
  oldChildren: VNodeWithUsed[],
  newChildren: VNodeWithUsed[],
  newStart: number,
  newEnd: number,
  index: DiffIndex,
  ops: DiffOp[],
  stats: DiffStats,
  config: AeroDiffOptions
): number {
  let movedCount = 0;
  
  for (let i = newStart; i <= newEnd; i++) {
    const newNode = newChildren[i]!;
    let oldIdx = -1;
    
    // 优先级 1：Key 完全匹配
    if (newNode.key != null) {
      const keyMatch = index.keyMap.get(newNode.key);
      if (keyMatch !== undefined && !oldChildren[keyMatch]!._used) {
        oldIdx = keyMatch;
      }
    }
    
    // 优先级 2：Type + Shape 兜底匹配
    if (oldIdx === -1 && config.enableTypeFallback) {
      const typeMatches = index.typeMap.get(newNode.type) || [];
      for (const candidateIdx of typeMatches) {
        if (!oldChildren[candidateIdx]!._used) {
          // 可选：Shape 匹配检查
          if (config.enableShapeMatching && !shapeMatch(oldChildren[candidateIdx]!, newNode)) {
            continue;
          }
          oldIdx = candidateIdx;
          break;
        }
      }
    }
    
    if (oldIdx >= 0) {
      const oldNode = oldChildren[oldIdx]!;
      oldNode._used = true;
      
      // 判断是否需要移动
      const isMove = oldIdx !== i;
      if (isMove) movedCount++;
      
      ops.push({
        type: isMove ? DiffOpType.MOVE : DiffOpType.UPDATE,
        oldNode,
        newNode,
        fromIndex: oldIdx,
        toIndex: i,
      });
      stats.reusedCount++;
    } else {
      // 无匹配：INSERT
      ops.push({
        type: DiffOpType.CREATE,
        newNode,
        toIndex: i,
      });
      stats.createdCount++;
    }
  }
  
  return movedCount;
}

/**
 * 简单的 Shape 匹配：比较 children 结构深度
 */
function shapeMatch(oldNode: VNodeWithUsed, newNode: VNodeWithUsed): boolean {
  // 类型不同直接 false
  if (oldNode.type !== newNode.type) return false;
  
  // 简单启发式：比较动态 props 数量
  const oldDynCount = (oldNode as any).dynamicProps?.length || 0;
  const newDynCount = (newNode as any).dynamicProps?.length || 0;
  
  return Math.abs(oldDynCount - newDynCount) <= 1;
}

/**
 * 清理未使用的旧节点
 */
function cleanupUnusedOldNodes(
  oldChildren: VNodeWithUsed[],
  start: number,
  end: number,
  ops: DiffOp[],
  stats: DiffStats
): void {
  for (let i = start; i <= end; i++) {
    const node = oldChildren[i]!;
    if (!node._used) {
      ops.push({
        type: DiffOpType.REMOVE,
        oldNode: node,
        fromIndex: i,
      });
      stats.deletedCount++;
    }
    // 清理标记
    delete node._used;
  }
}

// ============================================================================
// Block Diff - 基于 Block Tree 的优化 Diff
// ============================================================================

/**
 * Block 级别的 Diff
 * 对比两个 Block 的动态节点数组
 */
export function blockDiff(
  oldBlock: BlockWithChildren,
  newBlock: BlockWithChildren,
  options: Partial<AeroDiffOptions> = {}