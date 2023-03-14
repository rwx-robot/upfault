import { describe, it, expect } from 'vitest';
import { parse } from './parser';
import { buildBlockTree, BlockGranularity } from './block-tree';

describe('Block Tree Builder', () => {
  const createContext = (filename = 'test.uf') => ({
    filename,
    source: '',
    flags: {
      flags: 0,
      dynamicProps: [],
      hasEvent: false,
      hasSlot: false,
      staticKeys: new Set(),
      dynamicSlots: [],
    },
    imports: [],
    scope: { variables: new Map(), parent: null, level: 0 },
    errors: [],
    warnings: [],
  });

  describe('基础 Block Tree 构建', () => {
    it('应为简单模板创建根 Block', () => {
      const { ast, context } = parse('<div>Hello</div>');
      const result = buildBlockTree(ast, context, { granularity: BlockGranularity.Coarse });
      
      expect(result.rootBlock).toBeDefined();
      expect(result.rootBlock.type).toBe('root');
      expect(result.allBlocks).toHaveLength(1);
      expect(result.dynamicNodeCount).toBe(0);
      expect(result.staticNodeCount).toBeGreaterThan(0);
    });

    it('应为动态内容创建动态节点', () => {
      const { ast, context } = parse('<div>{{ count }}</div>');
      const result = buildBlockTree(ast, context, { granularity: BlockGranularity.Medium });
      
      expect(result.dynamicNodeCount).toBeGreaterThan(0);
      expect(result.rootBlock.compileFlags).toBeGreaterThan(0);
    });
  });

  describe('粒度控制', () => {
    it('Coarse 粒度：仅根 Block', () => {
      const { ast, context } = parse('<div><span>{{ a }}</span>{{ b }}</div>');
      const result = buildBlockTree(ast, context, { granularity: BlockGranularity.Coarse });
      
      expect(result.allBlocks).toHaveLength(1); // 只有根 Block
    });

    it('Medium 粒度：为控制流创建 Block', () => {
      const { ast, context } = parse('<div v-for="item in items">{{ item }}</div>');
      const result = buildBlockTree(ast, context, { granularity: BlockGranularity.Medium });
      
      // v-for 应创建单独 Block
      const forBlocks = result.allBlocks.filter(b => b.type === 'for');
      expect(forBlocks.length).toBeGreaterThanOrEqual(1);
    });

    it('Fine 粒度：每个动态节点创建 Block', () => {
      const { ast, context } = parse('<div>{{ a }}{{ b }}</div>');
      const result = buildBlockTree(ast, context, { granularity: BlockGranularity.Fine });
      
      // 两个插值各自创建 Block
      expect(result.allBlocks.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Block 属性', () => {
    it('Block 应包含正确的优先级', () => {
      const { ast, context } = parse('<div v-for="i in items">{{ i }}</div>');
      const result = buildBlockTree(ast, context, { granularity: BlockGranularity.Medium });
      
      const forBlock = result.allBlocks.find(b => b.type === 'for');
      expect(forBlock).toBeDefined();
      expect(forBlock!.priority).toBeGreaterThan(100);
    });

    it('Block 应收集动态属性', () => {
      const { ast, context } = parse('<div :class="cls" @click="fn">{{ text }}</div>');
      const result = buildBlockTree(ast, context, { granularity: BlockGranularity.Medium });
      
      expect(result.rootBlock.dynamicProps.has('class')).toBe(true);
      expect(result.rootBlock.hasEvent).toBe(true);
    });

    it('Block 应标记插槽', () => {
      const { ast, context } = parse('<div><slot name="header" /></div>');
