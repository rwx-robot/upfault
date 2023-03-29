import { describe, it, expect } from 'vitest';
import { parse } from './parser';
import { buildBlockTree, BlockGranularity } from './block-tree';
import { generateRenderFunction } from './codegen';

describe('Code Generator', () => {
  const createContext = (filename = 'test.uf') => ({
    filename,