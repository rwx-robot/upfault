/**
 * UpFault SSR - 核心渲染功能
 * 
 * 将组件渲染为 HTML 字符串、Node 流或 Web Stream
 */

import { h, type VNode, type ComponentInstance } from '@upfault/runtime';
import { Priority, type SchedulerTask } from '@upfault/scheduler';
import { VNodeType } from '@upfault/shared';

export interface SSRContext {
  modules: Set<string>;
  styles: Set<string>;
  scripts: Set<string>;
  preloadLinks: string[];
  meta: Record<string, string>;
  state: Record<string, any>;
  teleports: Map<string, string[]>;
  suspenseFallbacks: Map<string, string>;
}

export interface RenderOptions {
  context?: Partial<SSRContext>;
  clientManifest?: Record<string, string>;
  injectStyles?: boolean;
  injectScripts?: boolean;
  preload?: boolean;
  nonce?: string;
  serializeState?: boolean;
}

const DEFAULT_CONTEXT: SSRContext = {
  modules: new Set(),
  styles: new Set(),
  scripts: new Set<string>(),
  preloadLinks: [],
  meta: {},
  state: {},
  teleports: new Map(),
  suspenseFallbacks: new Map(),
};

/**
 * 将 VNode 渲染为 HTML 字符串
 */
export function renderToString(
  vnode: VNode,
  options: RenderOptions = {}
): string {
  const context = createContext(options);
  const renderer = createSSRRenderer(context);
  
  const html = renderer.renderToString(vnode);
  
  return injectHead(html, context, options);
}
