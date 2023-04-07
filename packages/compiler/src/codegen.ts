/**
 * UpFault Compiler - Code Generator
 * 
 * 从 Block Tree 生成渲染函数代码
 * 产出：带有编译时 metadata 的渲染函数，支持运行时高效 Diff
 */

import { BlockType, type Block, type BlockNode, type BlockTreeResult, type BlockGranularity } from './block-tree';
import type { TemplateAST, CompileContext, ImportSpec, CompileError, CompileWarning } from './parser';
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
    // 1. 生成 imports
    this.generateImports();
    
    // 2. 生成 hoisted 静态节点
    if (this.options.hoistStatic) {
      this.generateHoisted(this.blockTree.rootBlock);
    }
    
    // 3. 生成渲染函数
    this.generateRenderFunction();
    
    // 4. 生成 metadata
    const metadata = this.generateMetadata();
    
    return {
      code: this.code.join('\n'),
      ast: this.ast,
      imports: this.context.imports,
      metadata,
    };
  }

  private generateImports(): void {
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
    
    for (const helper of coreImports) {
      this.helpers.add(helper);
    }
    
    // 用户导入
    for (const imp of this.context.imports) {
      this.helpers.add(imp.name);
    }
    
    if (this.helpers.size > 0) {
      const imports = Array.from(this.helpers)
        .map(h => `import { ${h} } from '@upfault/runtime'`)
        .join('\n');
      this.code.push(imports);
      this.code.push('');
    }
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
