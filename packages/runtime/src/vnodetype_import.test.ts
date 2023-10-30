import { describe, it, expect } from 'vitest';
import { VNodeType } from '../../shared/src/diff';

describe('VNodeType import test', () => {
  it('should import VNodeType', () => {
    console.log('VNodeType:', VNodeType);
    console.log('ELEMENT:', VNodeType.ELEMENT);
    expect(VNodeType).toBeDefined();
    expect(VNodeType.ELEMENT).toBe(2);