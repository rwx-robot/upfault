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
