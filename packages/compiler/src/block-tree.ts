/**
 * UpFault Compiler - Block Tree
 * 
 * 编译时识别动态边界，生成最小化 Patch 树
 * 参考 Vue 3 Block Tree 设计，但简化为三档粒度
 */

import { VNodeFlags, VNodeType } from '@upfault/shared';
import type { TemplateAST, TemplateNode, ElementNode, ComponentNode, SlotNode, IfNode, ForNode, InterpolationNode, CommentNode, TextNode, CompileTimeFlags, CompileContext } from './parser';

// ============================================================================
// Block 类型定义
// ============================================================================

export const enum BlockGranularity {
  /** 粗粒度：整个组件为一个 Block */
  Coarse = 'coarse',
  /** 中粒度：按控制流结构分块 (if/for/组件) */
  Medium = 'medium',
  /** 细粒度：每个动态节点独立 Block */
  Fine = 'fine',
}

export interface Block {
  id: string;
  type: BlockType;
  granularity: BlockGranularity;
  root: BlockNode;
  dynamicNodes: BlockNode[]; // 编译时确定的动态节点
  priority: number; // 0-255
  parent: Block | null;
  children: Block[];
  // 编译时元数据
  compileFlags: number; // 聚合的 VNodeFlags
  staticKeys: Set<string>;
  dynamicProps: Set<string>;
  hasEvent: boolean;
  hasSlot: boolean;
}

export const enum BlockType {
  Root = 'root',           // 组件根 Block
  Element = 'element',     // 普通元素 Block
  Component = 'component', // 组件 Block
  Slot = 'slot',           // 插槽 Block
  If = 'if',               // v-if Block
  For = 'for',             // v-for Block
  Fragment = 'fragment',   // Fragment Block
}

export interface BlockNode {
  id: string;
  nodeType: VNodeType;
  tag: string;
  flags: number; // VNodeFlags
  props: PropMeta[];
  children: BlockNode[];
  parent: BlockNode | null;
  block: Block | null; // 归属的 Block
  // 动态性分析
  isDynamic: boolean;
  dynamicProps: string[];
  patchFlags: number; // PatchFlags 运行时优化
  textContent?: string; // 静态文本内容
  // 代码生成用
  hoisted?: string;
}

export interface PropMeta {
  name: string;
  isDynamic: boolean;
  isEvent: boolean;
  isKey: boolean;
  isRef: boolean;
  isSlot: boolean;
  valueType: 'static' | 'expression' | 'dynamic';
}

// ============================================================================
// Block Tree 构建器
// ============================================================================

export interface BlockTreeBuilderOptions {
  granularity: BlockGranularity;
  maxBlockDepth: number;
  enableFineGrained: boolean;
}

export interface BlockTreeResult {
  rootBlock: Block;
  allBlocks: Block[];
  dynamicNodeCount: number;
  staticNodeCount: number;
}

export function buildBlockTree(
  ast: TemplateAST, 
  context: CompileContext,
  options: BlockTreeBuilderOptions = { granularity: BlockGranularity.Medium, maxBlockDepth: 10, enableFineGrained: true }
): BlockTreeResult {
  const builder = new BlockTreeBuilder(ast, context, options);
  return builder.build();
}

class BlockTreeBuilder {
  private ast: TemplateAST;
  private context: CompileContext;
  private options: BlockTreeBuilderOptions;
  private blockIdCounter: number = 0;
  private nodeIdCounter: number = 0;
  private allBlocks: Block[] = [];
  private currentBlock: Block | null = null;

  constructor(ast: TemplateAST, context: CompileContext, options: BlockTreeBuilderOptions) {
    this.ast = ast;
    this.context = context;
    this.options = options;
  }

  build(): BlockTreeResult {
    // 创建根 Block
    const rootBlock = this.createBlock(BlockType.Root, BlockGranularity.Coarse);
    this.currentBlock = rootBlock;
    
    // 递归构建 Block Tree
    const rootNode = this.buildBlockNodes(this.ast.children, rootBlock);
    
    rootBlock.root = rootNode;
    this.collectDynamicNodes(rootBlock);
    
    return {
      rootBlock,
      allBlocks: this.allBlocks,
      dynamicNodeCount: this.countDynamicNodes(rootBlock),
      staticNodeCount: this.countStaticNodes(rootBlock),
    };
  }

  private createBlock(type: BlockType, granularity: BlockGranularity): Block {
    const id = `block_${++this.blockIdCounter}`;
    const block: Block = {
      id,
      type,