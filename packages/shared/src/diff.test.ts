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