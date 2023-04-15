import { describe, it, expect } from 'vitest';
import { parse } from './parser';

describe('Template Parser', () => {
  describe('基础解析', () => {
    it('应解析简单文本', () => {