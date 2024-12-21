// Minimal type declarations for @upfault/runtime to satisfy SSR package's tsc
// These are intentionally minimal - full types are in the runtime package itself

import type { VNode, VNodeProps, VNodeType } from '@upfault/shared/diff';

declare module '@upfault/runtime' {
  // VNode creation
  export function h(
    type: string | any,
    props?: VNodeProps | null,
    ...children: any[]
  ): VNode;
  
  export function Fragment(
    props: VNodeProps | null,
    ...children: any[]
  ): VNode;
  
  export function Text(text: string | number): VNode;
  export function Comment(text: string): VNode;
  
  export const jsx: typeof h;
  export const jsxs: typeof h;
  export const jsxDEV: typeof h;
  export const FragmentSymbol: VNodeType.FRAGMENT;
  