/**
 * ESTree 通用工具
 *
 * 只用 `eslint-visitor-keys` 的键表遍历，未知节点类型回退到「枚举自有键」——
 * 这样即便脚本块交给 TS 解析器产生了本插件不认识的节点，也不会漏遍历。
 */

import { KEYS } from 'eslint-visitor-keys';

export interface EsNode {
  type: string;
  range?: [number, number];
  [key: string]: unknown;
}

const NON_CHILD_KEYS = new Set(['type', 'loc', 'range', 'parent', 'start', 'end']);

export function childKeys(node: EsNode): string[] {
  const known = (KEYS as unknown as Record<string, string[] | undefined>)[node.type];
  if (known) return known;
  return Object.keys(node).filter((k) => !NON_CHILD_KEYS.has(k));
}

/**
 * 收集绑定模式里的名字（函数形参、解构、rest 都覆盖）。
 * 用于「遮蔽」判断：形参里的名字不应算作对上层绑定的引用。
 */
export function bindingNames(pattern: unknown, out: Set<string>): void {
  if (!isNodeLike(pattern)) return;
  switch (pattern.type) {
    case 'Identifier':
      out.add(String(pattern.name));
      return;
    case 'AssignmentPattern':
      bindingNames(pattern.left, out);
      return;
    case 'RestElement':
      bindingNames(pattern.argument, out);
      return;
    case 'ArrayPattern':
      for (const el of (pattern.elements as unknown[]) ?? []) bindingNames(el, out);
      return;
    case 'ObjectPattern':
      for (const prop of (pattern.properties as EsNode[]) ?? []) {
        bindingNames(prop.type === 'RestElement' ? prop.argument : prop.value, out);
      }
      return;
    default:
      return;
  }
}

function isNodeLike(value: unknown): value is EsNode {
  return (
    !!value &&
    typeof value === 'object' &&
    typeof (value as { type?: unknown }).type === 'string'
  );
}

/** 深度优先遍历（含根节点自身） */
export function walk(node: unknown, visit: (n: EsNode) => void): void {
  if (!isNodeLike(node)) return;
  visit(node);
  for (const key of childKeys(node)) {
    const value = node[key];
    if (Array.isArray(value)) {
      for (const item of value) walk(item, visit);
    } else {
      walk(value, visit);
    }
  }
}

/**
 * 把所有 `range` 平移 delta。
 *
 * 脚本块解析时会在源码前补换行/空格，让 loc 直接落在 `.uf` 原文坐标上
 * （见 script.ts），此时只有 range 需要回退补齐的长度。
 */
export function shiftRanges(node: unknown, delta: number): void {
  walk(node, (n) => {
    if (Array.isArray(n.range) && n.range.length === 2) {
      n.range = [n.range[0]! + delta, n.range[1]! + delta];
    }
  });
}
