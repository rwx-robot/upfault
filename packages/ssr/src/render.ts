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
  
  return new ReadableStream({
    async start(controller) {
      try {
        await renderer.renderToStream(vnode, (chunk) => {
          controller.enqueue(new TextEncoder().encode(chunk));
        });
        const headHtml = generateHeadHtml(context, options);
        controller.enqueue(new TextEncoder().encode(generateHeadHtml(context, options)));
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });
}

/**
 * 将渲染结果管道输出到 Node.js Writable
 */
export function pipeToNodeWritable(
  vnode: VNode,
  writable: NodeJS.WritableStream,
  options: RenderOptions = {}
): Promise<void> {
  const context = createContext(options);
  const renderer = createSSRRenderer(context);
  
  return new Promise((resolve, reject) => {
    renderer.renderToStream(vnode, (chunk) => {
      if (!writable.write(chunk)) {
        writable.once('drain', () => {});
      }
    }).then(() => {
      const headHtml = generateHeadHtml(context, options);
      writable.write(headHtml);
      writable.end();
      resolve();
    }).catch(reject);
  });
}

/**
 * 将渲染结果管道输出到 Web WritableStream
 */
export function pipeToWebWritable(
  vnode: VNode,
  writable: WritableStream,
  options: RenderOptions = {}
): Promise<void> {
  const context = createContext(options);
  const renderer = createSSRRenderer(context);
  const writer = writable.getWriter();
  
  return renderer.renderToStream(vnode, (chunk) => {
    return writer.write(new TextEncoder().encode(chunk));
  }).then(async () => {
    const headHtml = generateHeadHtml(context, options);
    await writer.write(new TextEncoder().encode(generateHeadHtml(context, options)));
    await writer.close();
  });
}

// ============================================================================
// 内部实现
// ============================================================================

function createContext(options: RenderOptions): SSRContext {
  return {
    ...DEFAULT_CONTEXT,
    ...options.context,
  };
}

interface SSRRenderer {
  renderToString(vnode: VNode): string;
  renderToStream(vnode: VNode, onChunk: (chunk: string) => void): Promise<void>;
}

function createSSRRenderer(context: SSRContext) {
  return {
    renderToString(vnode: VNode): string {
      return renderVNodeToString(vnode);
    },
    async renderToStream(vnode: VNode, onChunk: (chunk: string) => void) {
      await renderVNodeToStream(vnode, onChunk);
    },
  };
}

function renderVNodeToString(vnode: VNode): string {
  if (!vnode) return '';
  
  if (typeof vnode === 'string') return escapeHtml(vnode);
  if (typeof vnode === 'number') return String(vnode);
  if (!vnode || typeof vnode !== 'object') return '';
  
  const type = (vnode as any).type;
  
  if (type === VNodeType.TEXT) {
    return escapeHtml((vnode as any).children as string);
  }
  
  if (type === VNodeType.COMMENT) {
    return '<!--' + (vnode as any).children + '-->';
  }
  
  if (type === VNodeType.FRAGMENT) {
    const children = (vnode as any).children as VNode[];
    return children.map(renderVNodeToString).join('');
  }
  
  // Element or Component
  const tag = typeof (vnode as any).type === 'string' ? (vnode as any).type : 'div';
  const props = (vnode as any).props || {};
  const children = (vnode as any).children as VNode[];
  
  const attrs = Object.entries(props)
    .filter(([k, v]) => k !== 'children' && v != null && v !== false && !k.startsWith('on'))
    .map(([k, v]) => {
      if (v === true) return k;
      return `${k}="${escapeHtml(String(v))}"`;
    })
    .join(' ');
  
  const childrenHtml = Array.isArray(children)
    ? children.map(renderVNodeToString).join('')
    : typeof children === 'string'
      ? escapeHtml(children)
      : '';
  
  const voidTags = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
  
  if (voidTags.has(tag)) {
    return `<${tag}${attrs ? ' ' + attrs : ''}>`;
  }
  
  return `<${tag}${attrs ? ' ' + attrs : ''}>${childrenHtml}</${tag}>`;
}

async function renderVNodeToStream(vnode: VNode, onChunk: (chunk: string) => void): Promise<void> {
  // 简化实现：直接生成字符串然后分块发送
  const html = renderVNodeToString(vnode);
  const chunkSize = 8192;
  for (let i = 0; i < html.length; i += chunkSize) {
    onChunk(html.slice(i, i + chunkSize));
    // 允许事件循环
    await new Promise(resolve => setImmediate(resolve));
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, '&apos;');
}

function injectHead(html: string, context: SSRContext, options: RenderOptions): string {
  const headHtml = generateHeadHtml(context, options);
  
  // 注入到 <head> 标签中
  if (html.includes('<head>')) {
    return html.replace('<head>', `<head>${headHtml}`);
  }
  
  // 如果没有 head 标签，在 body 前注入
  if (html.includes('<body>')) {
    return html.replace('<body>', `${headHtml}<body>`);
  }
  
  // 兜底：直接前置
  return headHtml + html;
}

function generateHeadHtml(context: SSRContext, options: RenderOptions): string {
  const parts: string[] = [];
  
  // Meta 标签
  for (const [name, content] of Object.entries(context.meta)) {
    parts.push(`<meta name="${name}" content="${escapeHtml(content)}">`);
  }
  
  // Preload links
  if (options.preload !== false) {