/**
 * UpFault Compiler - Code Generator
 * 
 * 从 Block Tree 生成渲染函数代码
 * 产出：带有编译时 metadata 的渲染函数，支持运行时高效 Diff
 */

import { BlockType, type Block, type BlockNode, type BlockTreeResult, type BlockGranularity } from './block-tree';
import type { TemplateAST, CompileContext, ImportSpec, CompileError, CompileWarning } from './parser';
import { VNodeType, PatchFlags } from '@upfault/shared';