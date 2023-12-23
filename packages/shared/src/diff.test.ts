import { describe, it, expect } from 'vitest';
import {
  VNodeType,
  PatchFlags,
  DiffOpType,
  DEFAULT_AERODIFF_OPTIONS,
} from './diff';

describe('Diff Types', () => {
  describe('VNodeType', () => {
    it('应定义所有节点类型', () => {
      expect(VNodeType.TEXT).toBe(1);
      expect(VNodeType.ELEMENT).toBe(2);
      expect(VNodeType.COMPONENT).toBe(3);
      expect(VNodeType.BLOCK).toBe(4);
      expect(VNodeType.FRAGMENT).toBe(5);
      expect(VNodeType.COMMENT).toBe(6);
      expect(VNodeType.TELEPORT).toBe(7);
      expect(VNodeType.SUSPENSE).toBe(8);
    });
  });
