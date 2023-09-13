import type { VNode } from './h';
import type { ComponentInstance } from '@upfault/shared/diff';
import { VNodeType } from '@upfault/shared/diff';
import { aeroDiff, DiffOpType, type DiffOp, type DiffResult, type Block } from '@upfault/diff';
import { PatchFlags, type VNode as SharedVNode, type ComponentInstance as SharedComponentInstance, type Component } from '@upfault/shared';