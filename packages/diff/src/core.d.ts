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
import { VNode, DiffResult, AeroDiffOptions, Block } from '@upfault/shared';
interface BlockWithChildren extends Block {
    children: BlockWithChildren[];
}
/**
 * AeroDiff 主入口 - 双端扩散算法
 *
 * @param oldChildren 旧子节点数组
 * @param newChildren 新子节点数组
 * @param options 算法配置
 * @returns DiffResult 包含操作序列和统计信息
 */
export declare function aeroDiff(oldChildren: VNode[], newChildren: VNode[], options?: Partial<AeroDiffOptions>): DiffResult;
/**
 * Block 级别的 Diff
 * 对比两个 Block 的动态节点数组
 */
export declare function blockDiff(oldBlock: BlockWithChildren, newBlock: BlockWithChildren, options?: Partial<AeroDiffOptions>): DiffResult;
/**
 * 递归 Block Tree Diff
 */
export declare function diffBlockTree(oldBlock: BlockWithChildren, newBlock: BlockWithChildren, results?: DiffResult[], options?: Partial<AeroDiffOptions>): DiffResult[];
