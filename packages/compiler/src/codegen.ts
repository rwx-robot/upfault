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