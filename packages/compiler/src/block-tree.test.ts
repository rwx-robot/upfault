import { describe, it, expect } from 'vitest';
import { parse } from './parser';
import { buildBlockTree, BlockGranularity } from './block-tree';