import type { VNode } from './h';
import type { ComponentInstance } from '@upfault/shared/diff';
import { VNodeType } from '@upfault/shared/diff';
import { aeroDiff, DiffOpType, type DiffOp, type DiffResult, type Block } from '@upfault/diff';