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
      const result = compileTemplate('<ul><li v-for="i in list">{{ i }}</li></ul>');
      
      expect(result.code).toContain('ul');
      expect(result.code).toContain('Fragment');
    });
  });

  describe('静态提升', () => {
    it('应提升静态子树', () => {
      const result = compileTemplate('<div><span>Static</span>{{ dynamic }}</div>');
      
      // 静态提升逻辑
      expect(result.code).toContain('createVNode');
      expect(result.code).toContain('Static');
    });
  });

  describe('Metadata', () => {
    it('应生成正确的元数据', () => {
      const result = compileTemplate('<div>{{ count }}</div>');
      
      expect(result.metadata).toBeDefined();
      // 组件名从文件名提取
      expect(result.metadata.templateHash).toMatch(/^0x[0-9a-f]{8}$/);
      expect(result.metadata.compileFlags).toBeGreaterThan(0);
      expect(result.metadata.helpers).toContain('h');
    });
  });

  describe('复杂模板', () => {
    it('应处理复杂嵌套模板', () => {
      const template = `
        <div class="container">
          <header>
            <h1>{{ title }}</h1>
            <nav>
              <a v-for="link in links" :href="link.url" :key="link.id">{{ link.text }}</a>
            </nav>
          </header>
          <main>
            <slot name="content" />
          </main>
        </div>
      `;
      
      const result = compileTemplate(template);
      
      expect(result.code).toContain('class');
      expect(result.code).toContain('title');
      expect(result.code).toContain('Fragment');
      expect(result.code).toContain('slot');
    });
  });

  describe('导入生成', () => {
    it('应生成必要的运行时导入', () => {
      const result = compileTemplate('<div>{{ x }}</div>');
      
      expect(result.code).toContain("import {");