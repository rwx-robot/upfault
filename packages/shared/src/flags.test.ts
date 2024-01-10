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