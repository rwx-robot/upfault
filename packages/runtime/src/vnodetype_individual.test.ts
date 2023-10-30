import { describe, it, expect } from 'vitest';
import { 
  VNodeType_ELEMENT,
  VNodeType_TEXT,
  VNodeType_COMMENT,
  VNodeType_FRAGMENT,
  VNodeType_COMPONENT,
} from '../../shared/src/diff';

describe('VNodeType individual imports test', () => {
  it('should import individual VNodeType constants', () => {
    console.log('VNodeType_ELEMENT:', VNodeType_ELEMENT);
    console.log('VNodeType_TEXT:', VNodeType_TEXT);
    expect(VNodeType_ELEMENT).toBe(2);
    expect(VNodeType_TEXT).toBe(1);
