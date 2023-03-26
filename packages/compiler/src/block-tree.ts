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
      granularity,
      root: null!,
      dynamicNodes: [],
      priority: this.calculatePriority(type),
      parent: this.currentBlock,
      children: [],
      compileFlags: 0,
      staticKeys: new Set(),
      dynamicProps: new Set(),
      hasEvent: false,
      hasSlot: false,
    };
    
    this.allBlocks.push(block);
    
    if (this.currentBlock) {
      this.currentBlock.children.push(block);
    }
    
    return block;
  }

  private calculatePriority(type: BlockType): number {
    // 优先级：交互 > 列表 > 条件 > 静态
    switch (type) {
      case BlockType.Component: return 200;
      case BlockType.For: return 150;
      case BlockType.If: return 100;
      case BlockType.Slot: return 80;
      case BlockType.Element: return 50;
      case BlockType.Fragment: return 30;
      case BlockType.Root: return 10;
    }
  }

  private buildBlockNodes(nodes: TemplateNode[], parentBlock: Block): BlockNode {
    // 根据粒度决定是否创建子 Block
    const childNodes: BlockNode[] = [];
    
    for (const node of nodes) {
      const blockNode = this.convertToBlockNode(node, parentBlock);
      
      // 决定是否为该节点创建新 Block
      if (this.shouldCreateBlock(node)) {
        const childBlock = this.createBlockForNode(node);
        const prevBlock = this.currentBlock;
        this.currentBlock = childBlock;
        childBlock.parent = parentBlock;
        
        // 递归构建子节点
        const childRoot = this.buildBlockNodes(this.getNodeChildren(node), childBlock);
        childBlock.root = childRoot;
        this.collectDynamicNodes(childBlock);
        
        this.currentBlock = prevBlock;
        blockNode.block = childBlock;
      } else {
        blockNode.block = parentBlock;
      }
      
      childNodes.push(blockNode);
    }
    
    // 创建 Fragment 包装器
    if (childNodes.length === 1) {
      const node = childNodes[0];
      if (node) return node;
    }
    
    return this.createFragmentNode(childNodes, parentBlock);
  }

  private shouldCreateBlock(node: TemplateNode): boolean {
    if (this.options.granularity === BlockGranularity.Fine) {
      // 细粒度：任何动态节点都创建 Block
      return this.isDynamicNode(node);
    }
    
    if (this.options.granularity === BlockGranularity.Coarse) {
      // 粗粒度：只为根组件创建 Block
      return false;
    }
    
    // 中粒度：为控制流、组件、插槽创建 Block
    return (
      node.type === 'Component' ||
      node.type === 'Slot' ||
      node.type === 'If' ||
      node.type === 'For' ||
      (node.type === 'Element' && this.isDynamicElement(node)) ||
      (node.type === 'Element' && this.isSlotElement(node))
    );
  }
  
  private isSlotElement(node: TemplateNode): boolean {
    return node.type === 'Element' && (node.tag === 'slot' || node.tag.startsWith('slot:'));
  }

  private isDynamicNode(node: TemplateNode): boolean {
    return (
      node.type === 'Interpolation' ||
      node.type === 'Component' ||
      node.type === 'Slot' ||
      node.type === 'If' ||
      node.type === 'For' ||
      (node.type === 'Element' && this.isDynamicElement(node))
    );
  }
  
  private isDynamicElement(node: TemplateNode): boolean {
    if (node.type !== 'Element') return false;
    // slot 元素总是动态的
    if (node.tag === 'slot' || node.tag.startsWith('slot:')) return true;
    return (
      node.props.some(p => p.isDynamic || p.isEvent) ||
      node.children.some(c => this.isDynamicNode(c))
    );
  }

  private createBlockForNode(node: TemplateNode): Block {
    switch (node.type) {
      case 'Component':
        return this.createBlock(BlockType.Component, BlockGranularity.Medium);
      case 'Slot':
        return this.createBlock(BlockType.Slot, BlockGranularity.Medium);
      case 'If':
        return this.createBlock(BlockType.If, BlockGranularity.Medium);
      case 'For':
        return this.createBlock(BlockType.For, BlockGranularity.Medium);
      case 'Element':
        return this.createBlock(BlockType.Element, BlockGranularity.Medium);
      default:
        return this.createBlock(BlockType.Fragment, BlockGranularity.Medium);
    }
  }

  private convertToBlockNode(node: TemplateNode, parentBlock: Block): BlockNode {
    const id = `node_${++this.nodeIdCounter}`;
    
    switch (node.type) {
      case 'Element':
        return this.convertElement(node, id, parentBlock);
      case 'Component':
        return this.convertComponent(node, id, parentBlock);
      case 'Slot':
        return this.convertSlot(node, id, parentBlock);
      case 'If':
        return this.convertIf(node, id, parentBlock);
      case 'For':
        return this.convertFor(node, id, parentBlock);
      case 'Text':
        return this.convertText(node, id, parentBlock);
      case 'Interpolation':
        return this.convertInterpolation(node, id, parentBlock);
      case 'Comment':
        return this.convertComment(node, id, parentBlock);
      default:
        return this.createFragmentNode([], parentBlock);
    }
  }

  private convertElement(node: ElementNode, id: string, parentBlock: Block): BlockNode {
    const props = node.props.map(p => this.convertProp(p));
    const isDynamic = this.isDynamicElement(node);
    const flags = this.calculateNodeFlags(node, props);
    const dynamicProps = props.filter(p => p.isDynamic).map(p => p.name);
    const patchFlags = this.calculatePatchFlags(node, props);
    
    return {
      id,
      nodeType: VNodeType.ELEMENT,
      tag: node.tag,
      flags,
      props,
      children: node.children.map(c => this.convertToBlockNode(c, parentBlock)),
      parent: null,
      block: parentBlock,
      isDynamic,
      dynamicProps,
      patchFlags,
    };
  }

  private convertComponent(node: ComponentNode, id: string, parentBlock: Block): BlockNode {
    const props = node.props.map(p => this.convertProp(p));
    const flags = 4 | 64; // COMPONENT | HAS_SLOT (简化)
    
    return {
      id,
      nodeType: VNodeType.COMPONENT,
      tag: node.name,
      flags,
      props,
      children: node.children.map(c => this.convertToBlockNode(c, parentBlock)),
      parent: null,
      block: parentBlock,
      isDynamic: true,
      dynamicProps: props.filter(p => p.isDynamic).map(p => p.name),
      patchFlags: 512, // PatchFlags.COMPONENT
    };
  }

  private convertSlot(node: SlotNode, id: string, parentBlock: Block): BlockNode {
    return {
      id,
      nodeType: VNodeType.ELEMENT,
      tag: 'slot',
      flags: 64, // HAS_SLOT
      props: [],
      children: node.fallback.map(c => this.convertToBlockNode(c, parentBlock)),
      parent: null,
      block: parentBlock,
      isDynamic: true,
      dynamicProps: [],
      patchFlags: 256, // PatchFlags.DYNAMIC_SLOTS
    };
  }

  private convertIf(node: IfNode, id: string, parentBlock: Block): BlockNode {
    // v-if 生成 Fragment，包含所有分支
    const branchNodes = node.branches.map(branch => 
      this.createFragmentNode(branch.children.map(c => this.convertToBlockNode(c, parentBlock)), parentBlock)
    );
    
    return this.createFragmentNode(branchNodes, parentBlock);
  }

  private convertFor(node: ForNode, id: string, parentBlock: Block): BlockNode {
    // v-for 生成 Fragment，标记为 keyed fragment
    const flags = 16; // MULTI_DYNAMIC
    const props: PropMeta[] = [];
    if (node.key) {
      props.push({
        name: 'key',
        isDynamic: true,
        isEvent: false,
        isKey: true,
        isRef: false,
        isSlot: false,
        valueType: 'expression',
      });
    }
    
    return {
      id,
      nodeType: VNodeType.FRAGMENT,
      tag: 'for',
      flags,
      props,
      children: node.children.map(c => this.convertToBlockNode(c, parentBlock)),
      parent: null,
      block: parentBlock,
      isDynamic: true,
      dynamicProps: node.key ? ['key'] : [],
      patchFlags: 64, // PatchFlags.KEYED_FRAGMENT
    };
  }

  private convertText(node: TextNode, id: string, parentBlock: Block): BlockNode {
    return {
      id,
      nodeType: VNodeType.TEXT,
      tag: '#text',
      flags: 1, // STATIC_TEXT
      props: [],
      children: [],
      parent: null,
      block: parentBlock,
      isDynamic: false,
      dynamicProps: [],
      patchFlags: 0,
      textContent: node.content, // 存储文本内容
    };
  }

  private convertInterpolation(node: InterpolationNode, id: string, parentBlock: Block): BlockNode {
    return {
      id,
      nodeType: VNodeType.TEXT,
      tag: '#text',
      flags: 8, // PURE_DYNAMIC
      props: [],
      children: [],
      parent: null,
      block: parentBlock,
      isDynamic: true,
      dynamicProps: [node.expression], // 使用实际表达式
      patchFlags: 1, // PatchFlags.TEXT
    };
  }

  private convertComment(node: CommentNode, id: string, parentBlock: Block): BlockNode {
    return {
      id,
      nodeType: VNodeType.COMMENT,
      tag: '!--',
      flags: 1, // STATIC_TEXT (简化)
      props: [],
      children: [],
      parent: null,
      block: parentBlock,
      isDynamic: false,
      dynamicProps: [],
      patchFlags: 0,
    };
  }

  private createFragmentNode(nodes: BlockNode[], parentBlock: Block): BlockNode {
    return {
      id: `fragment_${++this.nodeIdCounter}`,
      nodeType: VNodeType.FRAGMENT,
      tag: 'fragment',
      flags: 0,
      props: [],
      children: nodes,
      parent: null,
      block: parentBlock,
      isDynamic: nodes.some(n => n.isDynamic),