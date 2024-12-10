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

/**
 * 将 VNode 渲染为 Node.js Readable Stream
 */
export function renderToNodeStream(
  vnode: VNode,
  options: RenderOptions = {}
): NodeJS.ReadableStream {
  const { Readable } = require('stream');
  const context = createContext(options);
  const renderer = createSSRRenderer(context);
  
  const stream = new Readable({
    read() {},
    objectMode: false,
  });
  
  // 异步渲染到流
  renderer.renderToStream(vnode, (chunk) => {
    stream.push(chunk);
  }).then(() => {
    const headHtml = generateHeadHtml(context, options);
    stream.unshift(headHtml);
    stream.push(null);
  }).catch(err => {
    stream.destroy(err);
  });
  
  return stream;
}

/**
 * 将 VNode 渲染为 Web ReadableStream
 */
export function renderToWebStream(
  vnode: VNode,
  options: RenderOptions = {}
): ReadableStream {
  const context = createContext(options);
  const renderer = createSSRRenderer(context);
  
