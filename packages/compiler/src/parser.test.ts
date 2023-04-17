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
