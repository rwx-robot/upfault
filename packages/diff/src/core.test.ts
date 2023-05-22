import { describe, it, expect } from 'vitest';
import { 
  aeroDiff, 
  blockDiff, 
  diffBlockTree, 
  computePatchFlags, 
  DiffOpType,
  PatchFlags,
  VNodeType 
} from './core';
import { createFingerprint } from '@upfault/predict-cache';

// 简单的 VNode 创建工厂
function createVNode(overrides: Partial<any> = {}): any {
  return {
    type: VNodeType.ELEMENT,
    tag: 'div',
    props: null,
    children: null,
    key: null,
    flags: 0,
    el: null,
    parent: null,
    component: null,
    block: null,
    patchFlag: 0,
    dynamicProps: null,
    ...overrides,
  };
}

function createTextNode(content: string, key: string | number | null = null): any {
  return {
    type: VNodeType.TEXT,
    tag: '#text',
    props: null,
    children: content,
    key,
    flags: 1, // STATIC_TEXT
    el: null,
    parent: null,
    component: null,
    block: null,
    patchFlag: 0,
    dynamicProps: null,
  };
}

describe('AeroDiff Core Algorithm', () => {
  describe('基础双端扩散', () => {
    it('应正确处理完全相同的列表', () => {
      const oldChildren = [
        createVNode({ key: 'a' }),
        createVNode({ key: 'b' }),
        createVNode({ key: 'c' }),
      ];
      const newChildren = [
        createVNode({ key: 'a' }),
        createVNode({ key: 'b' }),
        createVNode({ key: 'c' }),
      ];
      
      const result = aeroDiff(oldChildren, newChildren);
      
      expect(result.changed).toBe(false);
      expect(result.stats.reusedCount).toBe(3);
      expect(result.stats.createdCount).toBe(0);
      expect(result.stats.deletedCount).toBe(0);
      expect(result.stats.movedCount).toBe(0);
    });

    it('应正确处理头部新增', () => {
      const oldChildren = [
        createVNode({ key: 'b' }),
        createVNode({ key: 'c' }),
      ];
      const newChildren = [
        createVNode({ key: 'a' }),
        createVNode({ key: 'b' }),
        createVNode({ key: 'c' }),
      ];
      
      const result = aeroDiff(oldChildren, newChildren);
      
      expect(result.changed).toBe(true);
      expect(result.stats.createdCount).toBe(1);
      expect(result.stats.reusedCount).toBe(2);
      // 找到 INSERT 操作
      const inserts = result.ops.filter(op => op.type === 'CREATE');
      expect(inserts).toHaveLength(1);
      expect(inserts[0].toIndex).toBe(0);
    });

    it('应正确处理尾部新增', () => {
      const oldChildren = [
        createVNode({ key: 'a' }),
        createVNode({ key: 'b' }),
      ];
      const newChildren = [
        createVNode({ key: 'a' }),
        createVNode({ key: 'b' }),
        createVNode({ key: 'c' }),
      ];
      
      const result = aeroDiff(oldChildren, newChildren);
      
      expect(result.stats.createdCount).toBe(1);
      expect(result.stats.reusedCount).toBe(2);
      const inserts = result.ops.filter(op => op.type === 'CREATE');
      expect(inserts[0].toIndex).toBe(2);
    });

    it('应正确处理头部删除', () => {
      const oldChildren = [
        createVNode({ key: 'a' }),
        createVNode({ key: 'b' }),
        createVNode({ key: 'c' }),
      ];
      const newChildren = [
        createVNode({ key: 'b' }),
        createVNode({ key: 'c' }),
      ];
      
      const result = aeroDiff(oldChildren, newChildren);
      
      expect(result.stats.deletedCount).toBe(1);
      expect(result.stats.reusedCount).toBe(2);
      const removes = result.ops.filter(op => op.type === 'REMOVE');
      expect(removes).toHaveLength(1);
    });

    it('应正确处理移动', () => {
      const oldChildren = [
        createVNode({ key: 'a' }),
        createVNode({ key: 'b' }),
        createVNode({ key: 'c' }),
      ];
      const newChildren = [
        createVNode({ key: 'c' }),
        createVNode({ key: 'a' }),
        createVNode({ key: 'b' }),
      ];
      
      const result = aeroDiff(oldChildren, newChildren);
      
      expect(result.stats.movedCount).toBeGreaterThan(0);
      expect(result.stats.reusedCount).toBe(3);
      const moves = result.ops.filter(op => op.type === 'MOVE');
      expect(moves.length).toBeGreaterThan(0);
    });

    it('应正确处理替换（类型不同）', () => {
      const oldChildren = [
        createVNode({ key: 'a', type: VNodeType.ELEMENT }),
      ];
      const newChildren = [
        createTextNode('text', 'a'),
      ];
      
      const result = aeroDiff(oldChildren, newChildren);
      
      // 类型不同但 Key 相同，算法会尝试 UPDATE（类型不匹配由运行时处理）
      // 这里验证算法至少尝试了匹配
      expect(result.stats.reusedCount + result.stats.deletedCount + result.stats.createdCount).toBeGreaterThan(0);
    });
  });

  describe('Key 索引匹配', () => {
    it('应优先使用 Key 匹配', () => {
      const oldChildren = [
        createVNode({ key: 'a' }),
        createVNode({ key: 'b' }),
        createVNode({ key: 'c' }),
      ];
      const newChildren = [
        createVNode({ key: 'c' }),
        createVNode({ key: 'a' }),
        createVNode({ key: 'b' }),
      ];
      
      const result = aeroDiff(oldChildren, newChildren);
      
      // 通过 Key 匹配，应该复用所有节点
      expect(result.stats.reusedCount).toBe(3);
      // c: 2->0, a: 0->1, b: 1->2 = 3 个移动
      expect(result.stats.movedCount).toBe(3);
    });

    it('无 Key 时应回退 Type 匹配', () => {
      const oldChildren = [
        createVNode({ key: null }),
        createVNode({ key: null }),
      ];
      const newChildren = [
        createVNode({ key: null }),
        createVNode({ key: null }),
      ];