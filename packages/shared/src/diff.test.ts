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

  describe('PatchFlags', () => {
    it('应定义正确的位掩码值', () => {
      expect(PatchFlags.NONE).toBe(0);
      expect(PatchFlags.TEXT).toBe(1);
      expect(PatchFlags.CLASS).toBe(2);
      expect(PatchFlags.STYLE).toBe(4);
      expect(PatchFlags.PROPS).toBe(8);
      expect(PatchFlags.FULL_PROPS).toBe(16);
      expect(PatchFlags.EVENTS).toBe(32);
      expect(PatchFlags.KEYED_FRAGMENT).toBe(64);
      expect(PatchFlags.UNKEYED_FRAGMENT).toBe(128);
      expect(PatchFlags.DYNAMIC_SLOTS).toBe(256);
      expect(PatchFlags.COMPONENT).toBe(512);
      expect(PatchFlags.FULL_DIFF).toBe(1024);
      expect(PatchFlags.HOISTED).toBe(-1);
      expect(PatchFlags.BAIL).toBe(-2);
    });

    it('标志位应互不重叠 (除特殊负值)', () => {
      const positiveFlags = [
        PatchFlags.TEXT,
