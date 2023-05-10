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
import { DiffOpType, DEFAULT_AERODIFF_OPTIONS, PatchFlags } from '@upfault/shared';
import { isSameNode } from '@upfault/shared';
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
export function aeroDiff(oldChildren, newChildren, options = {}) {
    const config = { ...DEFAULT_AERODIFF_OPTIONS, ...options };
    const timer = { start: performance.now() };
    const oldLen = oldChildren.length;
    const newLen = newChildren.length;
    // 统计信息
    const stats = {
        oldCount: oldLen,
        newCount: newLen,
        reusedCount: 0,
        createdCount: 0,
        deletedCount: 0,
        movedCount: 0,
        duration: 0,
    };
    const ops = [];
    // Cast to extended type for _used marker