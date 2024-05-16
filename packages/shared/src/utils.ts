/**
 * UpFault Utilities - 通用工具函数
 * 
 * 纯函数、无副作用、可 Tree-shaking
 */

/**
 * 判断两个值是否为同一节点 (用于 Diff)
 */
export function isSameNode(a: VNodeLike, b: VNodeLike): boolean {
  return a.type === b.type && a.key === b.key;
}

/**
 * 判断是否为对象
