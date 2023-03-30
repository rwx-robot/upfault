import { describe, it, expect } from 'vitest';
import { parse } from './parser';
import { buildBlockTree, BlockGranularity } from './block-tree';
import { generateRenderFunction } from './codegen';

describe('Code Generator', () => {
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

  const compileTemplate = (template: string, granularity = BlockGranularity.Medium) => {
    const { ast, context } = parse(template);
    const blockTree = buildBlockTree(ast, context, { granularity });
    return generateRenderFunction(ast, context, blockTree);
  };

  describe('基础代码生成', () => {
    it('应生成简单元素渲染代码', () => {
      const result = compileTemplate('<div>Hello</div>');
      
      expect(result.code).toContain('createVNode');
