/**
 * UpFault Compiler - Code Generator
 * 
 * 从 Block Tree 生成渲染函数代码
 * 产出：带有编译时 metadata 的渲染函数，支持运行时高效 Diff
 */

import { BlockType, buildBlockTree, BlockGranularity, type Block, type BlockNode, type BlockTreeResult, type BlockGranularity as BlockGranularityType } from './block-tree';
// parse 必须以值形式静态导入：此前这里用 require('./parser')，
// 在 ESM（Vite/vitest）环境下 require 未定义，compile() 会直接抛
// MODULE_NOT_FOUND —— 该缺陷使整个 compile() API 在 ESM 下不可用。
import { parse, type TemplateAST, type CompileContext, type ImportSpec, type CompileError, type CompileWarning } from './parser';
import { VNodeType, PatchFlags } from '@upfault/shared';
import type { VNodeFlags } from '@upfault/shared';

// ============================================================================
// 代码生成配置
// ============================================================================

export interface CodegenOptions {
  mode: 'module' | 'function';
  target: 'es2020' | 'es2015';
  sourceMap: boolean;
  filename: string;
  optimizeImports: boolean;
  hoistStatic: boolean;
  cacheHandlers: boolean;
  generateAnnotations: boolean; // 生成 DevTools 注解
}

export interface CodegenResult {
  code: string;
  ast: TemplateAST;
  imports: ImportSpec[];
  metadata: RenderMetadata;
  sourceMap?: string;
}

export interface RenderMetadata {
  blockTree: BlockTreeResult;
  componentName: string;
  templateHash: string;
  compileFlags: number;
  hasDynamicSlots: boolean;
  hasHoisted: boolean;
  helpers: string[];
}

// ============================================================================
// 渲染函数代码生成
// ============================================================================

export function generateRenderFunction(
  ast: TemplateAST,
  context: CompileContext,
  blockTree: BlockTreeResult,
  options: CodegenOptions = {
    mode: 'module',
    target: 'es2020',
    sourceMap: false,
    filename: 'anonymous.uf',
    optimizeImports: true,
    hoistStatic: true,
    cacheHandlers: true,
    generateAnnotations: true,
  }
): CodegenResult {
  const generator = new CodeGenerator(ast, context, blockTree, options);
  return generator.generate();
}

class CodeGenerator {
  private ast: TemplateAST;
  private context: CompileContext;
  private blockTree: BlockTreeResult;
  private options: CodegenOptions;
  private code: string[] = [];
  private indentLevel: number = 0;
  private helpers: Set<string> = new Set();
  private hoisted: string[] = [];
  private hoistId: number = 0;

  constructor(
    ast: TemplateAST,
    context: CompileContext,
    blockTree: BlockTreeResult,
    options: CodegenOptions
  ) {
    this.ast = ast;
    this.context = context;
    this.blockTree = blockTree;
    this.options = options;
  }

  generate(): CodegenResult {
    // 1. 生成 hoisted 静态节点
    if (this.options.hoistStatic) {
      this.generateHoisted(this.blockTree.rootBlock);
    }
    
    // 2. 生成渲染函数（过程中通过 useHelper() 登记实际用到的 helper）
    this.generateRenderFunction();
    
    // 3. imports 必须最后生成并前置到顶部：helper 依赖只有在主体代码
    //    生成完毕后才能确定。此前顺序颠倒（先 imports 后主体），
    //    产物里的 import 区块恒为空 —— 生成的代码无法运行。
    const importBlock = this.buildImports();
    if (importBlock) {
      this.code.unshift(importBlock, '');
    }
    
    // 4. 生成 metadata
    const metadata = this.generateMetadata();
    
    return {
      code: this.code.join('\n'),
      ast: this.ast,
      imports: this.context.imports,
      metadata,
    };
  }

  /** 构造 import 区块（在主体代码生成之后调用） */
  private buildImports(): string {
    // 核心运行时 imports
    const coreImports = [
      'h',
      'Fragment',
      'Text',
      'Comment',
      'openBlock',
      'createBlock',
      'createVNode',
      'createElementVNode',
      'createTextVNode',
      'createCommentVNode',
      'withDirectives',
      'vShow',
      'vModel',
      'mergeProps',
      'normalizeClass',
      'normalizeStyle',
      'toHandlers',
    ];
    
    // 按需引入：只导出生成过程中实际用到的 helper。
    // 此前这里无条件把 18 个 helper 全部注入（且完全忽略 optimizeImports 选项），
    // 导致每个产物都带 18 行 import —— 在小模板中占产物体积的一半以上。
    // 各 generate*Code 在生成时调用 useHelper() 登记依赖。
    if (!this.options.optimizeImports) {
      for (const helper of coreImports) {
        this.helpers.add(helper);
      }
    }
    
    // 用户导入
    for (const imp of this.context.imports) {
      this.helpers.add(imp.name);
    }
    
    if (this.helpers.size === 0) return '';
    
    return Array.from(this.helpers)
      .map(h => `import { ${h} } from '@upfault/runtime'`)
      .join('\n');
  }

  /** 登记运行时 helper 依赖（供按需 import 使用） */
  private useHelper(name: string): void {
    this.helpers.add(name);
  }

  private generateHoisted(block: Block): void {
    for (const node of block.dynamicNodes) {
      // 静态子树提升
      this.hoistStaticSubtree(node, block);
    }
    
    for (const childBlock of block.children) {
      this.generateHoisted(childBlock);
    }
  }

  private hoistStaticSubtree(node: BlockNode, block: Block): void {
    // 查找纯静态子树
    const staticChildren = this.findStaticChildren(node);
    
    for (const child of staticChildren) {
      const hoistCode = this.generateHoistedNode(child);
      if (hoistCode) {
        this.hoisted.push(`const _hoisted_${++this.hoistId} = ${hoistCode}`);
        child.hoisted = `_hoisted_${this.hoistId}`;
      }
    }
  }

  private findStaticChildren(node: BlockNode): BlockNode[] {
    const result: BlockNode[] = [];
    
    for (const child of node.children) {
      if (!child.isDynamic && child.children.length > 0) {
        result.push(child);
      }
      result.push(...this.findStaticChildren(child));
    }
    
    return result;
  }

  private generateHoistedNode(node: BlockNode): string {
    // 生成静态节点的创建代码
    return this.generateNodeCode(node, { hoisted: true });
  }

  private generateRenderFunction(): void {
    const componentName = this.extractComponentName();
    
    this.code.push(`export function render(_ctx, _cache) {`);
    this.indentLevel++;
    
    this.code.push(`return (`);
    this.indentLevel++;
    
    this.generateBlockRender(this.blockTree.rootBlock);
    
    this.indentLevel--;
    this.code.push(`)`);
    this.indentLevel--;
    this.code.push(`}`);
  }

  private generateBlockRender(block: Block): void {
    if (block.type === BlockType.Root) {
      this.generateNodeRender(block.root);
    } else {
      this.code.push(`openBlock(${block.priority})`);
      this.code.push(`createBlock(`);
      this.indentLevel++;
      this.generateNodeRender(block.root);
      this.indentLevel--;
      this.code.push(`)`);
    }
  }

  private generateNodeRender(node: BlockNode): void {
    if (node.hoisted) {
      this.code.push(node.hoisted);
      return;
    }
    
    const code = this.generateNodeCode(node);
    this.code.push(code);
  }

  private generateNodeCode(node: BlockNode, options: { hoisted?: boolean } = {}): string {
    const { hoisted } = options;
    
    switch (node.nodeType) {
      case VNodeType.ELEMENT:
        return this.generateElementCode(node, hoisted);
      case VNodeType.COMPONENT:
        return this.generateComponentCode(node, hoisted);
      case VNodeType.TEXT:
        return this.generateTextCode(node, hoisted);
      case VNodeType.COMMENT:
        return this.generateCommentCode(node, hoisted);
      case VNodeType.FRAGMENT:
        return this.generateFragmentCode(node, hoisted);
      case VNodeType.BLOCK:
        return this.generateBlockCode(node, hoisted);
      default:
        return 'null';
    }
  }

  private generateElementCode(node: BlockNode, hoisted?: boolean): string {
    const { tag, props, children, patchFlags, dynamicProps, isDynamic } = node;
    
    const args: string[] = [this.quote(tag)];
    
    // Props
    const propsCode = this.generatePropsCode(props, dynamicProps);
    if (propsCode) {
      args.push(propsCode);
    } else {
      args.push('null');
    }
    
    // Children
    const childrenCode = this.generateChildrenCode(children);
    if (childrenCode) {
      args.push(childrenCode);
    } else {
      args.push('null');
    }
    
    // Patch flags
    if (patchFlags > 0) {
      args.push(patchFlags.toString());
    }
    
    const fn = isDynamic ? 'createElementVNode' : 'createVNode';
    this.useHelper(fn);
    return `${fn}(${args.join(', ')})`;
  }

  private generateComponentCode(node: BlockNode, hoisted?: boolean): string {
    const { tag, props, children, patchFlags } = node;
    
    const args: string[] = [this.quote(tag)];
    
    const propsCode = this.generatePropsCode(props, node.dynamicProps);
    if (propsCode) {
      args.push(propsCode);
    } else {
      args.push('null');
    }
    
    const childrenCode = this.generateChildrenCode(children);
    if (childrenCode) {
      args.push(childrenCode);
    } else {
      args.push('null');
    }
    
    if (patchFlags > 0) {
      args.push(patchFlags.toString());
    }
    
    this.useHelper('createVNode');
    return `createVNode(${args.join(', ')})`;
  }

  private generateTextCode(node: BlockNode, hoisted?: boolean): string {
    this.useHelper('createTextVNode');
    if (node.isDynamic) {
      // 插值表达式：纯标识符/成员路径（count / item.name）加 `_ctx.` 前缀；
      // 其他表达式（字符串字面量、运算、调用）原样输出。
      // 此前一律拼 `_ctx.${expr}`，遇到 `'a' + 'b'` 会生成
      // `_ctx.'a' + 'b'` —— 非法的 JS。
      const expr = node.dynamicProps[0] || 'textContent';
      return `createTextVNode(${this.renderExpression(expr)})`;
    }
    return `createTextVNode(${this.quote(node.textContent || '')})`;
  }

  private generateCommentCode(node: BlockNode, hoisted?: boolean): string {
    this.useHelper('createCommentVNode');
    return `createCommentVNode(${this.quote(node.tag)})`;
  }

  /**
   * 渲染插值表达式：
   * - 纯标识符 / 成员路径 → `_ctx.count` / `_ctx.item.name`
   * - 其他表达式 → 原样输出（`'a' + 'b'`、`format(x)`、字面量等）
   */
  private renderExpression(expr: string): string {
    const trimmed = expr.trim();
    if (/^[A-Za-z_$][A-Za-z0-9_$]*(\.[A-Za-z_$][A-Za-z0-9_$]*)*$/.test(trimmed)) {
      return `_ctx.${trimmed}`;
    }
    return trimmed;
  }

  private generateFragmentCode(node: BlockNode, hoisted?: boolean): string {
    const childrenCode = this.generateChildrenCode(node.children);
    const patchFlag = node.patchFlags === 64 ? 64 : 0; // KEYED_FRAGMENT
    this.useHelper('Fragment');
    
    if (childrenCode) {
      return `Fragment(${childrenCode}${patchFlag ? `, ${patchFlag}` : ''})`;
    }
    return `Fragment(null${patchFlag ? `, ${patchFlag}` : ''})`;
  }

  private generateBlockCode(node: BlockNode, hoisted?: boolean): string {
    if (!node.block) return 'null';
    this.useHelper('openBlock');
    return `openBlock(${node.block.priority})`;
  }

  private generatePropsCode(props: any[], dynamicProps: string[]): string {
    if (props.length === 0) return '';
    
    const obj: string[] = [];
    
    for (const prop of props) {
      const key = this.quote(prop.name);
      let value: string;

      // 此前这里取值用的是 prop.name（属性名），导致 `class="page"` 被生成成
      // `{ "class": "class" }`；且判断依据是 PropNode 上并不存在的
      // `prop.valueType` 字段，动态/表达式分支从未命中。
      // 现按真实契约取值：value === null 为布尔简写，其余按 PropValue 渲染。
      if (prop.value === null || prop.value === undefined) {
        // 布尔属性简写：<input disabled /> → { "disabled": true }
        value = 'true';
      } else if (prop.value.type === 'Literal') {
        value = this.quote(String(prop.value.value));
      } else {
        // Expression / Dynamic：标识符路径加 _ctx. 前缀，其余原样输出
        value = this.renderExpression(String(prop.value.value));
      }

      obj.push(`${key}: ${value}`);
    }
    
    return `{ ${obj.join(', ')} }`;
  }

  private generateChildrenCode(children: BlockNode[]): string {
    if (children.length === 0) return '';
    
    if (children.length === 1) {
      const child = children[0];
      if (!child) return '';
      return this.generateNodeCode(child);
    }
    
    const codes = children.map(c => this.generateNodeCode(c));
    return `[${codes.join(', ')}]`;
  }

  private generateMetadata(): RenderMetadata {
    return {
      blockTree: this.blockTree,
      componentName: this.extractComponentName(),
      templateHash: this.hashTemplate(this.ast.source),
      compileFlags: this.blockTree.rootBlock.compileFlags,
      hasDynamicSlots: this.blockTree.rootBlock.hasSlot,
      hasHoisted: this.hoisted.length > 0,
      helpers: Array.from(this.helpers),
    };
  }

  private extractComponentName(): string {
    const match = this.options.filename.match(/([^/]+)\.uf$/);
    return match && match[1] ? match[1] : 'Anonymous';
  }

  private hashTemplate(source: string): string {
    let hash = 0x811c9dc5;
    for (let i = 0; i < source.length; i++) {
      hash ^= source.charCodeAt(i);
      hash = (hash * 0x01000193) >>> 0;
    }
    return `0x${(hash >>> 0).toString(16).padStart(8, '0')}`;
  }

  private quote(str: string): string {
    return JSON.stringify(str);
  }
}

// ============================================================================
// 完整编译流水线
// ============================================================================

export interface CompilerOptions {
  filename: string;
  sourceMap?: boolean;
  hoistStatic?: boolean;
  cacheHandlers?: boolean;
  granularity?: BlockGranularity;
  devTools?: boolean;
}

export interface CompilerResult {
  code: string;
  ast: TemplateAST;
  blockTree: BlockTreeResult;
  metadata: RenderMetadata;
  sourceMap?: string;
  errors: CompileError[];
  warnings: CompileWarning[];
}

export function compile(template: string, options: CompilerOptions): CompilerResult {
  // 1. Parse（静态导入，见文件头说明）
  const { ast, context } = parse(template, { 
    filename: options.filename, 
    sourceMap: options.sourceMap 
  });
  
  // 2. Build Block Tree
  const blockTree = buildBlockTree(ast, context, { 
    // BlockGranularity 是 const enum，必须引用枚举成员而非字符串字面量
    granularity: options.granularity ?? BlockGranularity.Medium,
    maxBlockDepth: 10,
    enableFineGrained: true,
  });
  
  // 3. Generate Code（generateRenderFunction 定义在本文件内，
  //    此前错误地使用 require('./codegen') 自引用）
  const result = generateRenderFunction(ast, context, blockTree, {
    mode: 'module',
    target: 'es2020',
    sourceMap: options.sourceMap || false,
    filename: options.filename,
    optimizeImports: true,
    hoistStatic: options.hoistStatic !== false,
    cacheHandlers: options.cacheHandlers !== false,
    generateAnnotations: options.devTools !== false,
  });
  
  return {
    code: result.code,
    ast: result.ast,
    blockTree: result.metadata.blockTree,
    metadata: result.metadata,
    errors: context.errors,
    warnings: context.warnings,
  };
}

// 重新导出类型
export type { TemplateAST, CompileContext, ImportSpec, CompileError, CompileWarning } from './parser';
export type { BlockTreeResult, Block, BlockNode } from './block-tree';