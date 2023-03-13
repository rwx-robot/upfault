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
