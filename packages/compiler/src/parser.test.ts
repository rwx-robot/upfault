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
