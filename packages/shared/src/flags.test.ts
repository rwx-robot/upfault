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
