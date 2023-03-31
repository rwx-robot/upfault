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
      expect(result.code).toContain('div');
      // 静态文本渲染
    });

    it('应生成动态插值渲染代码', () => {
      const result = compileTemplate('<div>{{ count }}</div>');
      
      expect(result.code).toContain('createElementVNode');
      expect(result.code).toContain('div');
      // 插值表达式渲染为表达式值
      expect(result.code).toContain('_ctx.count');
    });

    it('应生成动态属性渲染代码', () => {
      const result = compileTemplate('<div :class="cls" :id="id"></div>');
      
      expect(result.code).toContain('createElementVNode');
      expect(result.code).toContain('div');
      // 动态属性渲染
      expect(result.code).toContain('class');
      expect(result.code).toContain('id');
    });

    it('应生成事件处理渲染代码', () => {
      const result = compileTemplate('<button @click="handleClick">Click</button>');
      
      expect(result.code).toContain('createElementVNode');
      expect(result.code).toContain('button');
      // 事件处理
      expect(result.code).toContain('click');
    });
  });

  describe('组件渲染', () => {
    it('应生成组件渲染代码', () => {
      const result = compileTemplate('<MyComponent :prop="value" />');
      
      expect(result.code).toContain('createVNode');
      expect(result.code).toContain('MyComponent');
      // 组件 props
      expect(result.code).toContain('prop');
    });

    it('应处理组件事件', () => {
      const result = compileTemplate('<Child @emit="onEmit" />');
      
      expect(result.code).toContain('Child');
      // 组件事件
      expect(result.code).toContain('emit');
    });
  });

  describe('控制流渲染', () => {
    it('应生成 v-for 渲染代码', () => {
      const result = compileTemplate('<li v-for="item in items" :key="item.id">{{ item.name }}</li>');
      
      expect(result.code).toContain('Fragment');
      // v-for 片段渲染
      expect(result.code).toContain('64'); // KEYED_FRAGMENT
    });

    it('应生成嵌套渲染代码', () => {