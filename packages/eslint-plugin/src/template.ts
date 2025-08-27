/**
 * 模板块 → UF* 自定义 AST
 *
 * 位置换算只有一条规则：**先把编译器给出的相对偏移加上模板块在文件中的起始偏移，
 * 得到文件绝对偏移，再由 PositionMapper 查行列**。编译器 parser 的 column 是
 * 1-based、ESLint 是 0-based，也在这里一并归一。
 */

import {
  parse,
  type CommentNode,
  type ComponentNode,
  type ElementNode,
  type ForNode,
  type IfNode,
  type InterpolationNode,
  type PropNode,
  type SourceLocation,
  type TemplateNode,
  type TextNode,
} from '@upfault/compiler';
import type {
  LintLoc,
  LintRange,
  UFAttribute,
  UFDirectiveKind,
  UFExpression,
  UFTemplateNode,
} from './ast';
import type { PositionMapper } from './position';

export interface TemplateContext {
  /** 模板块内容（不含 <template> 标签） */
  templateSource: string;
  /** 模板块内容的起始偏移（相对整个 .uf 文件） */
  templateOffset: number;
  mapper: PositionMapper;
  filename: string;
}

interface NodeBase {
  loc: LintLoc;
  range: LintRange;
}

function nodeBase(loc: SourceLocation, ctx: TemplateContext): NodeBase {
  const start = ctx.templateOffset + loc.start.offset;
  const end = ctx.templateOffset + loc.end.offset;
  return { loc: ctx.mapper.loc(start, end), range: ctx.mapper.range(start, end) };
}

/** 在属性原文里定位「值」的起点（跳过 `=` 与引号） */
function locateAttributeValue(attrSource: string): number {
  const eq = attrSource.indexOf('=');
  if (eq < 0) return -1;
  let i = eq + 1;
  while (i < attrSource.length && /\s/.test(attrSource[i]!)) i++;
  const quote = attrSource[i];
  if (quote === '"' || quote === "'") return i + 1;
  return i;
}

/**
 * 把一段表达式原文定位到文件绝对偏移。
 *
 * `raw` 一定是 `loc.source` 的逐字子串；`searchFrom` 用于消歧
 * （如 `v-for="items in items"`，取值必须从别名之后再找）。
 */
function locateExpression(raw: string, loc: SourceLocation | null, ctx: TemplateContext, searchFrom?: string): { start: number; end: number } {
  const src = loc?.source ?? '';
  const base = ctx.templateOffset + (loc?.start.offset ?? 0);
  let from = 0;
  if (searchFrom && src) {
    const at = src.indexOf(searchFrom);
    from = at >= 0 ? at + searchFrom.length : 0;
  }
  // v-for 的表达式前后可能有 `(` `)`（`(t, i) in items`），逐字查找仍然成立
  const idx = raw ? src.indexOf(raw, from) : -1;
  const start = idx >= 0 ? base + idx : base;
  return { start, end: start + raw.length };
}

function makeExpression(
  raw: string,
  loc: SourceLocation | null,
  ctx: TemplateContext,
  locals: string[],
  searchFrom?: string
): UFExpression {
  const { start, end } = locateExpression(raw, loc, ctx, searchFrom);
  return {
    raw,
    loc: ctx.mapper.loc(start, end),
    range: ctx.mapper.range(start, end),
    locals,
  };
}

function attributeKind(prop: PropNode): UFDirectiveKind {
  if (prop.isEvent) return 'event';
  if (prop.isDirective) return 'directive';
  if (prop.isDynamic) return 'dynamic';
  return 'static';
}

function convertProp(prop: PropNode, ctx: TemplateContext): UFAttribute {
  const src = prop.loc.source;
  const eq = src.indexOf('=');
  const raw = (eq >= 0 ? src.slice(0, eq) : src).trim();
  const kind = attributeKind(prop);
  const valueText = prop.value === null || prop.value === undefined ? null : String(prop.value.value);

  // 表达式位置：在属性原文里跳过 `=` 与引号，值一定紧随其后
  let valueExpression: UFExpression | null = null;
  if (valueText !== null && kind !== 'static') {
    const at = locateAttributeValue(src);
    const start = ctx.templateOffset + prop.loc.start.offset + Math.max(0, at);
    const end = start + valueText.length;
    valueExpression = {
      raw: valueText,
      loc: ctx.mapper.loc(start, end),
      range: ctx.mapper.range(start, end),
      locals: [],
    };
  }

  return {
    name: prop.name,
    raw,
    kind,
    modifiers: [...(prop.eventModifiers ?? [])],
    value: valueText,
    valueExpression,
    ...nodeBase(prop.loc, ctx),
  };
}

/** v-for 别名的消歧用：`v-for="t in items"` 取 items 必须跳过 t */
function forSearchAnchor(forNode: ForNode): string | undefined {
  return forNode.value || undefined;
}

function convertNode(
  node: TemplateNode,
  ctx: TemplateContext,
  locals: string[]
): UFTemplateNode | null {
  switch (node.type) {
    case 'Element':
    case 'Component': {
      const host = node as ElementNode | ComponentNode;
      const children = convertNodes(host.children, ctx, locals);
      const attributes = (host.props ?? []).map((p) => convertProp(p, ctx));
      const base = nodeBase(host.loc, ctx);
      if (node.type === 'Component') {
        return { type: 'UFComponent', name: (host as ComponentNode).name, attributes, children, ...base };
      }
      return { type: 'UFElement', tag: (host as ElementNode).tag, attributes, children, ...base };
    }

    case 'Text': {
      const text = node as TextNode;
      return { type: 'UFText', value: text.content, ...nodeBase(text.loc, ctx) };
    }

    case 'Comment': {
      const comment = node as CommentNode;
      return { type: 'UFComment', value: comment.content, ...nodeBase(comment.loc, ctx) };
    }

    case 'Interpolation': {
      const inter = node as InterpolationNode;
      return {
        type: 'UFInterpolation',
        expression: makeExpression(inter.expression, inter.loc, ctx, locals),
        ...nodeBase(inter.loc, ctx),
      };
    }

    case 'If': {
      const ifNode = node as IfNode;
      return {
        type: 'UFIf',
        branches: ifNode.branches.map((branch) => ({
          condition:
            branch.condition === null
              ? null
              : makeExpression(branch.condition, branch.loc, ctx, locals),
          children: convertNodes(branch.children, ctx, locals),
          ...nodeBase(branch.loc, ctx),
        })),
        ...nodeBase(ifNode.loc, ctx),
      };
    }

    case 'For': {
      const forNode = node as ForNode;
      const childLocals = forNode.indexAlias
        ? [...locals, forNode.value, forNode.indexAlias]
        : [...locals, forNode.value];
      const source = makeExpression(
        forNode.source,
        forNode.directiveLoc ?? forNode.loc,
        ctx,
        locals,
        forSearchAnchor(forNode)
      );
      const keyLoc = forNode.keyLoc ?? forNode.loc;
      return {
        type: 'UFFor',
        source,
        value: forNode.value,
        indexAlias: forNode.indexAlias,
        // null 严格表示「没写 :key」，与「定位失败」区分开
        key: forNode.key === null ? null : makeExpression(forNode.key, keyLoc, ctx, locals, ':key'),
        children: convertNodes(forNode.children, ctx, childLocals),
        ...nodeBase(forNode.loc, ctx),
      };
    }

    default:
      // Slot 等尚未在 parser 里产出的节点：不猜，直接跳过
      return null;
  }
}

function convertNodes(
  nodes: TemplateNode[] | undefined,
  ctx: TemplateContext,
  locals: string[]
): UFTemplateNode[] {
  const out: UFTemplateNode[] = [];
  for (const node of nodes ?? []) {
    const converted = convertNode(node, ctx, locals);
    if (converted) out.push(converted);
  }
  return out;
}

/**
 * 转换整个模板块。
 *
 * 模板语法错误由编译器负责报告（`parse()` 的 errors 会在这里被忽略）：
 * ESLint 侧只做静态检查，语法不合法时返回已解析出的部分，避免双份报错。
 */
export function convertTemplate(ctx: TemplateContext): UFTemplateNode[] {
  const { ast } = parse(ctx.templateSource, { filename: `${ctx.filename}.template` });
  return convertNodes(ast.children, ctx, []);
}
