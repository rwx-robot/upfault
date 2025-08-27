/**
 * 代码生成器「结构契约」测试
 *
 * 这里只断言**产物形态**（字符串层面）：API 选择、import 按需、metadata。
 * 行为正确性（真实 DOM、响应式更新）由 codegen-exec.test.ts 通过执行产物验证。
 *
 * 历史教训：旧测试把 `createElementVNode` / `createTextVNode` 这类
 * runtime 根本不存在的 API 写成了期望值，产物从未被执行过，缺陷长期潜伏。
 * 因此任何新增断言都必须对齐 `@upfault/runtime` 的真实导出。
 */

import { describe, it, expect } from 'vitest';
import { parse } from './parser';
import { buildBlockTree, BlockGranularity } from './block-tree';
import { generateRenderFunction } from './codegen';

describe('Code Generator', () => {
  const compileTemplate = (template: string, granularity = BlockGranularity.Medium) => {
    const { ast, context } = parse(template);
    const blockTree = buildBlockTree(ast, context, { granularity });
    return generateRenderFunction(ast, context, blockTree);
  };

  describe('基础代码生成', () => {
    it('应生成简单元素渲染代码', () => {
      const result = compileTemplate('<div>Hello</div>');

      expect(result.code).toContain('h("div"');
      expect(result.code).toContain('"Hello"');
    });

    it('应生成动态插值渲染代码', () => {
      const result = compileTemplate('<div>{{ count }}</div>');

      expect(result.code).toContain('h("div"');
      expect(result.code).toContain('_ctx.count');
    });

    it('应生成动态属性渲染代码', () => {
      const result = compileTemplate('<div :class="cls" :id="id"></div>');

      expect(result.code).toContain('"class": _ctx.cls');
      expect(result.code).toContain('"id": _ctx.id');
    });

    it('静态属性保持字面量', () => {
      const result = compileTemplate('<div class="page" id="main"></div>');

      expect(result.code).toContain('"class": "page"');
      expect(result.code).toContain('"id": "main"');
    });

    it('应生成事件处理渲染代码', () => {
      const result = compileTemplate('<button @click="handleClick">Click</button>');

      expect(result.code).toContain('"onClick": _ctx.handleClick');
    });
  });

  describe('组件渲染', () => {
    it('应生成组件渲染代码（组件引用取自 _ctx）', () => {
      const result = compileTemplate('<MyComponent :prop="value" />');

      expect(result.code).toContain('h(_ctx.MyComponent');
      expect(result.code).toContain('"prop": _ctx.value');
    });

    it('kebab-case 组件名转为 PascalCase', () => {
      const result = compileTemplate('<my-child />');

      expect(result.code).toContain('_ctx.MyChild');
    });

    it('应处理组件事件', () => {
      const result = compileTemplate('<Child @emit="onEmit" />');

      expect(result.code).toContain('_ctx.Child');
      expect(result.code).toContain('"onEmit": _ctx.onEmit');
    });
  });

  describe('控制流渲染', () => {
    it('应生成 v-for 渲染代码', () => {
      const result = compileTemplate('<li v-for="item in items" :key="item.id">{{ item.name }}</li>');

      expect(result.code).toContain('.map(');
      expect(result.code).toContain('..._ctx.items.map((item) =>');
      expect(result.code).toContain('"key": item.id');
    });

    it('应生成嵌套渲染代码', () => {
      const result = compileTemplate('<ul><li v-for="i in list">{{ i }}</li></ul>');

      expect(result.code).toContain('h("ul"');
      expect(result.code).toContain('..._ctx.list.map((i) =>');
    });

    it('v-if 生成三元表达式且无 else 时兜底 null', () => {
      const result = compileTemplate('<div><p v-if="on">yes</p></div>');

      expect(result.code).toContain('_ctx.on ? h("p"');
      expect(result.code).toContain('null');
    });
  });

  describe('Metadata', () => {
    it('应生成正确的元数据', () => {
      const result = compileTemplate('<div>{{ count }}</div>');

      expect(result.metadata).toBeDefined();
      expect(result.metadata.templateHash).toMatch(/^0x[0-9a-f]{8}$/);
      expect(result.metadata.compileFlags).toBeGreaterThan(0);
      // helpers 只包含 runtime 真实存在的按需依赖
      expect(result.metadata.helpers).toEqual(['h']);
      expect(result.metadata.helpers).not.toContain('createTextVNode');
    });

    it('多根模板登记 Fragment', () => {
      const result = compileTemplate('<p>a</p><p>b</p>');

      expect(result.metadata.helpers).toContain('Fragment');
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

      expect(result.code).toContain('"class": "container"');
      expect(result.code).toContain('_ctx.title');
      expect(result.code).toContain('..._ctx.links.map((link) =>');
      // slot 尚未支持：生成 null 占位并给出告警，而不是产出游离的 <slot> 元素
      expect(result.code).toContain('h("main", null, [null])');
      expect(result.metadata.blockTree).toBeDefined();
    });
  });

  describe('导入生成', () => {
    it('应按需生成运行时导入', () => {
      const result = compileTemplate('<div>{{ x }}</div>');

      expect(result.code).toContain("import { h } from '@upfault/runtime';");
      // 未使用的 helper 不得注入
      for (const unused of ['openBlock', 'withDirectives', 'normalizeClass', 'vModel', 'toHandlers']) {
        expect(result.code).not.toContain(unused);
      }
    });

    it('不得引用 runtime 不存在的 API', () => {
      const result = compileTemplate('<div><span>{{ x }}</span></div>');

      for (const ghost of ['createElementVNode', 'createTextVNode', 'createVNode', 'createBlock']) {
        expect(result.code).not.toContain(ghost);
      }
    });
  });
});
