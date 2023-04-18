import { describe, it, expect } from 'vitest';
import { parse } from './parser';

describe('Template Parser', () => {
  describe('基础解析', () => {
    it('应解析简单文本', () => {
      const { ast } = parse('Hello World');
      expect(ast.children).toHaveLength(1);
      expect(ast.children[0].type).toBe('Text');
      expect((ast.children[0] as any).content).toBe('Hello World');
    });

    it('应解析简单元素', () => {
      const { ast } = parse('<div>Hello</div>');
      expect(ast.children).toHaveLength(1);
      expect(ast.children[0].type).toBe('Element');
      expect((ast.children[0] as any).tag).toBe('div');
      expect((ast.children[0] as any).children).toHaveLength(1);
    });

    it('应解析自闭合元素', () => {
      const { ast } = parse('<img src="test.jpg" />');
      expect(ast.children).toHaveLength(1);
      const el = ast.children[0] as any;
      expect(el.type).toBe('Element');
      expect(el.tag).toBe('img');
      expect(el.isSelfClosing).toBe(true);
    });

    it('应解析插值表达式', () => {
      const { ast } = parse('{{ count }}');
      expect(ast.children).toHaveLength(1);
      expect(ast.children[0].type).toBe('Interpolation');
      expect((ast.children[0] as any).expression).toBe('count');
    });

    it('应解析混合内容', () => {
      const { ast } = parse('<div>Hello {{ name }}</div>');
      expect(ast.children).toHaveLength(1);
      const el = ast.children[0] as any;
      expect(el.children).toHaveLength(2);
      expect(el.children[0].type).toBe('Text');
      expect(el.children[1].type).toBe('Interpolation');
    });
  });

  describe('属性解析', () => {
    it('应解析静态属性', () => {
      const { ast } = parse('<div class="container" id="app"></div>');
      const el = ast.children[0] as any;
      expect(el.props).toHaveLength(2);
      expect(el.props[0].name).toBe('class');
      expect(el.props[0].isDynamic).toBe(false);
      expect(el.props[1].name).toBe('id');
    });

    it('应解析动态属性 (: 或 v-bind:)', () => {
      const { ast } = parse('<div :class="cls" v-bind:id="id"></div>');
      const el = ast.children[0] as any;
      expect(el.props).toHaveLength(2);
      expect(el.props[0].name).toBe('class');
      expect(el.props[0].isDynamic).toBe(true);
      expect(el.props[1].name).toBe('id');
      expect(el.props[1].isDynamic).toBe(true);
    });

    it('应解析事件 (@ 或 v-on:)', () => {
      const { ast } = parse('<button @click="handleClick" v-on:submit.prevent="onSubmit"></button>');
      const el = ast.children[0] as any;
      expect(el.props).toHaveLength(2);
      expect(el.props[0].name).toBe('click');
      expect(el.props[0].isEvent).toBe(true);
      expect(el.props[1].name).toBe('submit');
      expect(el.props[1].isEvent).toBe(true);
      expect(el.props[1].eventModifiers).toContain('prevent');
    });

    it('应解析布尔属性简写', () => {
      const { ast } = parse('<input disabled required />');
      const el = ast.children[0] as any;
      expect(el.props).toHaveLength(2);
      expect(el.props[0].name).toBe('disabled');
      expect(el.props[0].value).toBeNull();
      expect(el.props[1].name).toBe('required');
    });
  });

  describe('组件解析', () => {
    it('应识别大写开头标签为组件', () => {
      const { ast } = parse('<MyComponent />');
      const el = ast.children[0] as any;
      expect(el.type).toBe('Component');
      expect(el.name).toBe('MyComponent');
      expect(el.isComponent).toBe(true);
    });

    it('应识别含连字符标签为组件', () => {
      const { ast } = parse('<my-component />');
      const el = ast.children[0] as any;
      expect(el.isComponent).toBe(true);
    });

    it('应解析组件 props 和事件', () => {
      const { ast } = parse('<UserCard :name="user.name" @select="onSelect" />');
      const el = ast.children[0] as any;
      expect(el.isComponent).toBe(true);
      expect(el.props).toHaveLength(2);
      expect(el.props[0].isDynamic).toBe(true);
      expect(el.props[1].isEvent).toBe(true);
    });
  });

  describe('控制流', () => {
    it('应解析 v-if', () => {
      const { ast } = parse('<div v-if="show">Content</div>');
      const el = ast.children[0] as any;
      expect(el.type).toBe('If');
      expect(el.branches).toHaveLength(2);
      expect(el.branches[0].condition).toBe('show');
    });

    it('应解析 v-for', () => {
      const { ast } = parse('<li v-for="item in items" :key="item.id">{{ item.name }}</li>');
      const el = ast.children[0] as any;
      expect(el.type).toBe('For');
      expect(el.source).toBe('items');
      expect(el.value).toBe('item');
      expect(el.key).toBe('item.id');
    });
  });

  describe('插槽', () => {
    it('应解析默认插槽', () => {
      const { ast } = parse('<slot>Fallback</slot>');
      const el = ast.children[0] as any;
      // slot 被识别为元素，标记为 slot
    });
  });

  describe('注释', () => {
    it('应解析 HTML 注释', () => {
      const { ast } = parse('<!-- This is a comment -->');
      expect(ast.children).toHaveLength(1);
      expect(ast.children[0].type).toBe('Comment');
      expect((ast.children[0] as any).content).toBe(' This is a comment ');
    });
  });

