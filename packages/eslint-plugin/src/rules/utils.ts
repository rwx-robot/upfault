/**
 * 规则共用工具
 *
 * 位置一律用「文件偏移 + `sourceCode.getLocFromIndex`」换算，而不是自己维护行列 ——
 * 规则拿到的 range 与 ESLint 的源码文本同一坐标系，天然精确且不会差一行。
 */

import type { Rule } from 'eslint';
import type { LintRange, UFTemplateNode } from '../ast';

export type RuleContext = Rule.RuleContext;

/** 取模板节点树（解析器挂在 Program.templateBody 上） */
export function templateBodyOf(context: RuleContext): UFTemplateNode[] {
  const ast = context.sourceCode.ast as unknown as { templateBody?: UFTemplateNode[] };
  return Array.isArray(ast.templateBody) ? ast.templateBody : [];
}

/** range → ESLint loc（自动夹到文本范围内） */
export function locOf(context: RuleContext, range: LintRange): { start: { line: number; column: number }; end: { line: number; column: number } } {
  const sourceCode = context.sourceCode;
  const length = sourceCode.text.length;
  const start = Math.max(0, Math.min(range[0], length));
  const end = Math.max(start, Math.min(range[1], length));
  return { start: sourceCode.getLocFromIndex(start), end: sourceCode.getLocFromIndex(end) };
}
