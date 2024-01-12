import { describe, it, expect } from 'vitest';
import {
  VNodeFlags,
  isStaticNode,
  isPureDynamic,
  isInteractive,
  isSkippable,
  isFrequentUpdate,
  markFrequentUpdate,
  unmarkFrequentUpdate,
  describeFlags,
} from './flags';

describe('VNodeFlags', () => {
  describe('位掩码常量', () => {
    it('应定义正确的位值', () => {
      expect(VNodeFlags.STATIC_TEXT).toBe(0b0000_0001);
      expect(VNodeFlags.STATIC_ELEMENT).toBe(0b0000_0010);
      expect(VNodeFlags.STATIC_KEY).toBe(0b0000_0100);
      expect(VNodeFlags.PURE_DYNAMIC).toBe(0b0000_1000);
      expect(VNodeFlags.MULTI_DYNAMIC).toBe(0b0001_0000);
      expect(VNodeFlags.HAS_EVENT).toBe(0b0010_0000);
      expect(VNodeFlags.HAS_SLOT).toBe(0b0100_0000);
      expect(VNodeFlags.FREQUENT_UPDATE).toBe(0b1000_0000);
    });

    it('组合标志应正确计算', () => {
      expect(VNodeFlags.STATIC).toBe(VNodeFlags.STATIC_TEXT | VNodeFlags.STATIC_ELEMENT);
      expect(VNodeFlags.DYNAMIC).toBe(VNodeFlags.PURE_DYNAMIC | VNodeFlags.MULTI_DYNAMIC);
      expect(VNodeFlags.INTERACTIVE).toBe(VNodeFlags.HAS_EVENT | VNodeFlags.HAS_SLOT);
      expect(VNodeFlags.SKIPPABLE).toBe(
        VNodeFlags.STATIC | (VNodeFlags.PURE_DYNAMIC & ~(VNodeFlags.HAS_EVENT | VNodeFlags.HAS_SLOT))
      );
    });
  });

  describe('isStaticNode', () => {
    it('静态文本应返回 true', () => {
      expect(isStaticNode(VNodeFlags.STATIC_TEXT)).toBe(true);
    });

    it('静态元素应返回 true', () => {
      expect(isStaticNode(VNodeFlags.STATIC_ELEMENT)).toBe(true);
    });

    it('组合静态标志应返回 true', () => {
      expect(isStaticNode(VNodeFlags.STATIC_TEXT | VNodeFlags.STATIC_ELEMENT)).toBe(true);
    });

    it('动态标志应返回 false', () => {
      expect(isStaticNode(VNodeFlags.PURE_DYNAMIC)).toBe(false);
      expect(isStaticNode(VNodeFlags.MULTI_DYNAMIC)).toBe(false);
    });
  });

  describe('isPureDynamic', () => {
    it('PURE_DYNAMIC 应返回 true', () => {