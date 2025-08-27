/**
 * `<script>` 块解析
 *
 * 目标有两个：
 * 1. 让 `.uf` 文件里的脚本仍然享受用户已有的 JS/TS 规则 —— 因此产出的是标准
 *    ESTree `body`，并把它挂进最终 AST 的 `Program.body`；
 * 2. 抽出「模板能看见哪些绑定」所需的信息（顶层声明名、setup() 返回值）。
 *
 * **位置对齐技巧**：解析前在脚本源码前补 `\n`（到它所在的行）与空格（到它所在的列），
 * 这样 acorn 算出的 `loc` 直接就是 `.uf` 文件坐标，无需再做行号偏移；只有 `range`
 * 需要按补齐长度回退（见 estree.shiftRanges）。这样避免了「模板块与脚本块谁在前」
 * 引起的各种差一行错误。
 */

import * as acorn from 'acorn';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import type { SFCBlock } from '@upfault/compiler';
import type { EsNode } from './estree';
import { bindingNames, shiftRanges } from './estree';

export interface DeclaredBinding {
  name: string;
  /** 文件绝对偏移 */
  start: number;
  end: number;
}

export interface ScriptAnalysis {
  body: EsNode[];
  comments: unknown[];
  tokens: unknown[];
  visitorKeys: Record<string, string[]> | null;
}

const EMPTY: ScriptAnalysis = {
  body: [],
  comments: [],
  tokens: [],
  visitorKeys: null,
};

let projectRequire: NodeRequire | null = null;

function requireFromProject(specifier: string): unknown {
  if (!projectRequire) {
    // 从「被 lint 的项目」解析，而不是从本插件自己的 node_modules 解析
    projectRequire = createRequire(join(process.cwd(), '__upfault_eslint_plugin__.js'));
  }
  return projectRequire(specifier);
}

/** 交给内层解析器（如 @typescript-eslint/parser）的解析选项 */
const INNER_PARSE_OPTIONS = {
  ecmaVersion: 'latest',
  sourceType: 'module',
  ranges: true,
  loc: true,
  comment: true,
  tokens: true,
} as const;

function isJsLang(lang: string | undefined): boolean {
  return lang === undefined || lang === '' || lang === 'js' || lang === 'mjs' || lang === 'jsx';
}

function parseWithInner(parser: unknown, code: string, filePath: string): { ast: EsNode; visitorKeys: Record<string, string[]> | null } {
  const resolved = typeof parser === 'string' ? requireFromProject(parser) : parser;
  const impl = resolved as {
    parseForESLint?: (code: string, options?: unknown) => { ast: EsNode; visitorKeys?: Record<string, string[]> };
    parse?: (code: string, options?: unknown) => EsNode;
  };
  const options = { ...INNER_PARSE_OPTIONS, filePath };
  if (typeof impl?.parseForESLint === 'function') {
    const result = impl.parseForESLint(code, options);
    return { ast: result.ast, visitorKeys: result.visitorKeys ?? null };
  }
  if (typeof impl?.parse === 'function') {
    return { ast: impl.parse(code, options), visitorKeys: null };
  }
  throw new Error('parserOptions.parser 不是合法的 ESLint 解析器（既无 parseForESLint 也无 parse）');
}

function parseWithAcorn(code: string): { ast: EsNode; comments: acorn.Comment[]; tokens: acorn.Token[] } {
  const comments: acorn.Comment[] = [];
  const tokens: acorn.Token[] = [];
  const ast = acorn.parse(code, {
    ecmaVersion: 'latest',
    sourceType: 'module',
    locations: true,
    ranges: true,
    onComment: comments,
    onToken: tokens,
  }) as unknown as EsNode;
  return { ast, comments, tokens };
}

function propertyKeyName(prop: EsNode): string | null {
  if (prop.type !== 'Property' || prop.computed) return null;
  const key = prop.key as EsNode | undefined;
  if (!key) return null;
  if (key.type === 'Identifier') return String(key.name);
  if (key.type === 'Literal') return String(key.value);
  return null;
}

function findProperty(objectExpr: EsNode, name: string): EsNode | null {
  const props = (objectExpr.properties as EsNode[] | undefined) ?? [];
  for (const prop of props) {
    if (propertyKeyName(prop) === name) return prop;
  }
  return null;
}

/**
 * 收集脚本顶层声明名（import / const / let / var / function / class）。
 *
 * 规则只对「脚本顶层声明过、又出现在模板里」的名字发问 —— 这类名字要么必须由
 * `setup()` 返回，要么就是明显写错了。props 与全局名都不在此集合内，
 * 因此不会误报（UpFault 的 props 没有静态声明，模板里无从区分）。
 */
export function collectDeclared(body: EsNode[]): Map<string, DeclaredBinding> {
  const declared = new Map<string, DeclaredBinding>();
  const add = (name: string, node: EsNode): void => {
    if (!declared.has(name)) {
      declared.set(name, { name, start: node.range?.[0] ?? 0, end: node.range?.[1] ?? 0 });
    }
  };

  const handleDeclaration = (node: EsNode): void => {
    switch (node.type) {
      case 'VariableDeclaration': {
        for (const declarator of (node.declarations as EsNode[]) ?? []) {
          const names = new Set<string>();
          bindingNames(declarator.id, names);
          for (const name of names) add(name, (declarator.id as EsNode) ?? node);
        }
        return;
      }
      case 'FunctionDeclaration':
      case 'ClassDeclaration': {
        const id = node.id as EsNode | undefined;
        if (id?.type === 'Identifier') add(String(id.name), id);
        return;
      }
      default:
        return;
    }
  };

  for (const node of body) {
    switch (node.type) {
      case 'ImportDeclaration': {
        for (const spec of (node.specifiers as EsNode[]) ?? []) {
          const local = spec.local as EsNode | undefined;
          if (local?.type === 'Identifier') add(String(local.name), local);
        }
        break;
      }
      case 'ExportNamedDeclaration':
      case 'ExportDefaultDeclaration': {
        const declaration = node.declaration as EsNode | undefined;
        if (declaration && declaration.type !== 'Identifier') handleDeclaration(declaration);
        break;
      }
      default:
        handleDeclaration(node);
        break;
    }
  }

  return declared;
}

/**
 * 静态判定 `setup()` 暴露了哪些名字。
 *
 * 返回 null 表示判不了（没有默认导出 / setup 的 return 不是对象字面量 / 对象里有展开），
 * 调用方必须就此收手 —— 猜错会直接变成用户的假阳性。
 */
export function collectSetupReturn(body: EsNode[]): Set<string> | null {
  const defaultExport = body.find((n) => n.type === 'ExportDefaultDeclaration');
  if (!defaultExport) return null;

  const component = defaultExport.declaration as EsNode | undefined;
  if (!component || component.type !== 'ObjectExpression') return null;

  const setupProp = findProperty(component, 'setup');
  // 没有 setup：模板只剩 props 可见 —— 空集是**确定**的信息，不是「判不了」
  if (!setupProp) return new Set();

  const fn = setupProp.value as EsNode | undefined;
  if (!fn || (fn.type !== 'FunctionExpression' && fn.type !== 'ArrowFunctionExpression')) return null;

  const fnBody = fn.body as EsNode | undefined;
  if (!fnBody) return null;
  if (fnBody.type !== 'BlockStatement') return null;

  const statements = (fnBody.body as EsNode[]) ?? [];
  for (const statement of statements) {
    if (statement.type !== 'ReturnStatement') continue;
    const returned = statement.argument as EsNode | undefined;
    if (!returned) return null;
    if (returned.type !== 'ObjectExpression') return null;
    const names = new Set<string>();
    for (const prop of (returned.properties as EsNode[]) ?? []) {
      if (prop.type === 'SpreadElement') return null; // 展开内容静态看不到
      const key = propertyKeyName(prop);
      if (key === null) return null; // 计算属性键同样看不到
      names.add(key);
    }
    return names;
  }
  return null; // setup 没有显式 return
}

/** 解析脚本块；解析失败直接抛出，由 ESLint 报成 fatal parsing error */
export function analyseScript(script: SFCBlock | null, innerParser: unknown, filename: string): ScriptAnalysis {
  if (!script) return EMPTY;

  const lang = script.attrs['lang'];
  if (!isJsLang(lang) && !innerParser) {
    const error = new Error(
      `<script${lang ? ` lang="${lang}"` : ''}> 无法解析：本插件内置解析器只支持 JS。` +
        `请在 ESLint 配置里指定 parserOptions.parser（例如 '@typescript-eslint/parser'）。`
    ) as Error & { lineNumber?: number; column?: number };
    error.lineNumber = script.loc.start.line;
    error.column = script.loc.start.column;
    throw error;
  }

  // 补齐到脚本块所在的「行 / 列」，让 loc 直接落在 .uf 文件坐标上
  const pad = '\n'.repeat(Math.max(0, script.loc.start.line - 1)) + ' '.repeat(Math.max(0, script.loc.start.column - 1));
  const code = pad + script.content;
  const delta = script.loc.start.offset - pad.length;

  let ast: EsNode;
  let comments: unknown[] = [];
  let tokens: unknown[] = [];
  let visitorKeys: Record<string, string[]> | null = null;

  try {
    if (innerParser) {
      const parsed = parseWithInner(innerParser, code, `${filename}.script`);
      ast = parsed.ast;
      visitorKeys = parsed.visitorKeys;
      comments = (ast.comments as unknown[]) ?? [];
      tokens = (ast.tokens as unknown[]) ?? [];
    } else {
      const parsed = parseWithAcorn(code);
      ast = parsed.ast;
      comments = parsed.comments;
      tokens = parsed.tokens;
    }
  } catch (err) {
    const error = err as Error & { loc?: { line: number; column: number }; lineNumber?: number; column?: number };
    if (error.lineNumber === undefined && error.loc) {
      error.lineNumber = error.loc.line;
      error.column = error.loc.column + 1;
    }
    throw error;
  }

  shiftRanges(ast, delta);
  for (const comment of comments) shiftRanges(comment, delta);
  for (const token of tokens) shiftRanges(token, delta);

  return {
    body: ((ast.body as EsNode[] | undefined) ?? []).slice(),
    comments,
    tokens,
    visitorKeys,
  };
}
