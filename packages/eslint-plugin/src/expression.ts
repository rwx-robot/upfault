/**
 * 模板表达式分析
 *
 * 模板表达式在 AST 里只存原文（见 ast.ts 的说明），需要真正 AST 的规则
 * 在这里按需 `acorn.parseExpressionAt`。表达式原文是 `.uf` 文件里的**逐字子串**，
 * 所以「子节点相对偏移 + 表达式起始偏移 = 文件绝对偏移」成立，
 * 报错位置因此能精确落到原文。
 */

import * as acorn from 'acorn';
import type { EsNode } from './estree';
import { bindingNames, childKeys } from './estree';
import type { UFExpression } from './ast';

/** 解析模板表达式；语法不合法时返回 null（交给编译器去报，lint 不重复抱怨） */
export function parseExpression(expr: UFExpression): EsNode | null {
  try {
    const node = acorn.parseExpressionAt(expr.raw, 0, { ecmaVersion: 'latest' }) as unknown as EsNode;
    return node && typeof node.type === 'string' ? node : null;
  } catch {
    return null;
  }
}

export interface Reference {
  name: string;
  /** 文件绝对偏移 */
  start: number;
  end: number;
}

function visit(
  node: EsNode | null | undefined,
  shadowed: Set<string>,
  base: number,
  out: Reference[]
): void {
  if (!node || typeof node.type !== 'string') return;

  switch (node.type) {
    case 'Identifier': {
      const name = String(node.name);
      if (!shadowed.has(name)) {
        out.push({ name, start: base + (node.range?.[0] ?? 0), end: base + (node.range?.[1] ?? 0) });
      }
      return;
    }
    // 属性名不是引用：`a.b` 只看 a；`a[b]` 两个都看
    case 'MemberExpression': {
      visit(node.object as EsNode, shadowed, base, out);
      if (node.computed) visit(node.property as EsNode, shadowed, base, out);
      return;
    }
    // 对象字面量/解构的键不是引用；简写 `{ done }` 的 key 与 value 是同一个节点，走 value
    case 'Property': {
      if (node.computed) visit(node.key as EsNode, shadowed, base, out);
      visit(node.value as EsNode, shadowed, base, out);
      return;
    }
    case 'MethodDefinition':
    case 'PropertyDefinition': {
      if (node.computed) visit(node.key as EsNode, shadowed, base, out);
      visit(node.value as EsNode, shadowed, base, out);
      return;
    }
    // 标签不是引用
    case 'LabeledStatement': {
      visit(node.body as EsNode, shadowed, base, out);
      return;
    }
    case 'BreakStatement':
    case 'ContinueStatement':
      return;
    // 函数形参会遮蔽同名外层绑定
    case 'ArrowFunctionExpression':
    case 'FunctionExpression': {
      const inner = new Set(shadowed);
      for (const param of (node.params as EsNode[]) ?? []) bindingNames(param, inner);
      visit(node.body as EsNode, inner, base, out);
      return;
    }
    case 'CatchClause': {
      const inner = new Set(shadowed);
      bindingNames(node.param as EsNode, inner);
      visit(node.body as EsNode, inner, base, out);
      return;
    }
    default: {
      for (const key of childKeys(node)) {
        const value = node[key];
        if (Array.isArray(value)) {
          for (const item of value) visit(item as EsNode, shadowed, base, out);
        } else {
          visit(value as EsNode, shadowed, base, out);
        }
      }
      return;
    }
  }
}

/**
 * 收集表达式里的标识符引用（写入也算引用；属性名、对象键、标签不算）。
 * `extraLocals` 用于屏蔽 v-for 迭代变量这类模板局部名。
 */
export function collectReferences(expr: UFExpression): Reference[] {
  const ast = parseExpression(expr);
  if (!ast) return [];
  const out: Reference[] = [];
  visit(ast, new Set(expr.locals), expr.range[0], out);
  return out;
}

/** 模板里「看起来像副作用」的节点类型 */
const SIDE_EFFECT_NODES: Record<string, string> = {
  AssignmentExpression: '赋值（= / += / …）',
  UpdateExpression: '自增自减（++ / --）',
  AwaitExpression: 'await',
  NewExpression: 'new 表达式',
  YieldExpression: 'yield',
};

export interface SideEffect {
  kind: string;
  start: number;
  end: number;
}

/** 找出表达式里的副作用节点（只报第一层命中，避免同一处重复刷屏） */
export function findSideEffects(expr: UFExpression): SideEffect[] {
  const ast = parseExpression(expr);
  if (!ast) return [];
  const out: SideEffect[] = [];
  const base = expr.range[0];
  const seen = new Set<EsNode>();
  const stack: EsNode[] = [ast];
  while (stack.length) {
    const node = stack.pop()!;
    if (seen.has(node)) continue;
    seen.add(node);
    const kind = SIDE_EFFECT_NODES[node.type];
    if (kind) {
      out.push({ kind, start: base + (node.range?.[0] ?? 0), end: base + (node.range?.[1] ?? 0) });
      continue; // 命中后不再下探，避免 `a = b = 1` 报两次
    }
    // 函数体内是延迟执行，不算模板渲染副作用
    if (node.type === 'ArrowFunctionExpression' || node.type === 'FunctionExpression') {
      continue;
    }
    for (const key of childKeys(node)) {
      const value = node[key];
      if (Array.isArray(value)) {
        for (const item of value) if (item && typeof item.type === 'string') stack.push(item as EsNode);
      } else if (value && typeof (value as EsNode).type === 'string') {
        stack.push(value as EsNode);
      }
    }
  }
  return out.sort((a, b) => a.start - b.start);
}
