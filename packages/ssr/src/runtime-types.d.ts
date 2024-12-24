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
  
  // Types
  export type VNodeChild = VNode | string | number | boolean | null | undefined | VNodeChild[];
  export type ComponentType = string | any;
  export type HFunction = typeof h;
  
  // Lifecycle hooks
  export function onBeforeMount(fn: () => void | Promise<void>): void;
  export function onMounted(fn: () => void | Promise<void>): void;
  export function onBeforeUpdate(fn: () => void | Promise<void>): void;
  export function onUpdated(fn: () => void | Promise<void>): void;
  export function onBeforeUnmount(fn: () => void | Promise<void>): void;
  export function onUnmounted(fn: () => void | Promise<void>): void;
  export function onActivated(fn: () => void | Promise<void>): void;
  export function onDeactivated(fn: () => void | Promise<void>): void;
  export function onErrorCaptured(fn: (err: Error, instance: any, info: string) => boolean | void): void;
  export function onRenderTracked(fn: (e: any) => void): void;
  export function onRenderTriggered(fn: (e: any) => void): void;
  export function getCurrentInstance(): any;
  export function setCurrentInstance(instance: any): void;
  
  export type LifecycleHook = () => void | Promise<void>;
  export interface LifecycleHooks {
    onBeforeMount?: LifecycleHook;
    onMounted?: LifecycleHook;
    onBeforeUpdate?: LifecycleHook;
    onUpdated?: LifecycleHook;
    onBeforeUnmount?: LifecycleHook;
    onUnmounted?: LifecycleHook;
    onActivated?: LifecycleHook;
    onDeactivated?: LifecycleHook;
    onErrorCaptured?: (error: Error, instance: any, info: string) => boolean | void;
    onRenderTracked?: (event: any) => void;
    onRenderTriggered?: (event: any) => void;
  }
  
  // Renderer
  export interface RendererOptions<
    HostElement = Element,
    HostText = Text,
    HostComment = Comment
  > {
    createElement: (tag: string, isSVG?: boolean) => HostElement;
    createText: (text: string) => HostText;
    createComment: (text: string) => HostComment;