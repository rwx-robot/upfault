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