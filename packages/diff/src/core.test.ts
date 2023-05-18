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