/**
 * `@upfault/eslint-plugin/parser` —— `.uf` 文件的 ESLint 解析器
 *
 * 产出「脚本 ESTree + 模板 UF* 节点」的混合 AST：
 *
 *     Program
 *     ├── body[]          <script> 块（标准 ESTree，用户既有规则照常生效）
 *     └── templateBody[]  <template> 块（UF* 节点，本插件的规则在此工作）
 *
 * 与传统 SFC 解析器的差异：模板表达式**不**转成 ESTree 表达式节点。原因见 ast.ts ——
 * 一旦模板里的 `count` 变成真正的 Identifier，`no-undef` 会把所有模板绑定判成未定义。
 */

import { parseSFC } from '@upfault/compiler';
import { KEYS } from 'eslint-visitor-keys';
import type { UFTemplateNode } from './ast';
import type { EsNode } from './estree';
import { PositionMapper } from './position';
import { analyseScript } from './script';
import { convertTemplate } from './template';

export interface UpfaultParserOptions {
  filePath?: string;
  parserOptions?: {
    /** 内层解析器：字符串（模块名）或解析器对象；用于 `<script lang="ts">` */
    parser?: unknown;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

const UF_VISITOR_KEYS: Record<string, string[]> = {
  UFElement: ['attributes', 'children'],
  UFComponent: ['attributes', 'children'],
  UFAttribute: [],
  UFIf: ['branches'],
  UFIfBranch: ['condition', 'children'],
  UFFor: ['source', 'key', 'children'],
  UFInterpolation: ['expression'],
  /** 表达式只有原文与位置，没有子节点可遍历 */
  UFExpression: [],
  UFText: [],
  UFComment: [],
};

export interface UpfaultParseResult {
  ast: EsNode & { templateBody: UFTemplateNode[] };
  visitorKeys: Record<string, string[]>;
  scopeManager: null;
  services: Record<string, unknown>;
}

export function parseForESLint(code: string, options: UpfaultParserOptions = {}): UpfaultParseResult {
  const filename = options.filePath ?? 'anonymous.uf';
  const mapper = new PositionMapper(code);
  const sfc = parseSFC(code, { filename });

  // 脚本块解析失败会直接抛出 —— ESLint 会把 parser 抛出的错误报成 fatal parsing error，
  // 这是 SFC 解析器的惯例（vue-eslint-parser 亦然），好过静默丢掉整份脚本的检查。
  const script = analyseScript(sfc.script, options.parserOptions?.parser, filename);

  const templateBody: UFTemplateNode[] = sfc.template
    ? convertTemplate({
        templateSource: sfc.template.content,
        templateOffset: sfc.template.loc.start.offset,
        mapper,
        filename,
      })
    : [];

  const baseKeys = KEYS as unknown as Record<string, string[]>;
  const visitorKeys: Record<string, string[]> = {
    ...baseKeys,
    ...(script.visitorKeys ?? {}),
    ...UF_VISITOR_KEYS,
  };
  // Program 必须额外遍历 templateBody；内层解析器也带 Program 键时要合并而不是覆盖
  visitorKeys['Program'] = [...new Set([...(baseKeys['Program'] ?? ['body']), ...(script.visitorKeys?.['Program'] ?? ['body']), 'templateBody'])];

  const ast = {
    type: 'Program',
    body: script.body,
    sourceType: 'module',
    comments: script.comments,
    tokens: script.tokens,
    templateBody,
    loc: { start: mapper.position(0), end: mapper.position(code.length) },
    range: mapper.whole(),
  } as unknown as EsNode & { templateBody: UFTemplateNode[] };

  return { ast, visitorKeys, scopeManager: null, services: {} };
}

export function parse(code: string, options: UpfaultParserOptions = {}): EsNode {
  return parseForESLint(code, options).ast;
}

export const parser = { parseForESLint, parse };
export default parser;
