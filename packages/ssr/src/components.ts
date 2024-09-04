/**
 * UpFault SSR - Streaming Rendering
 * 
 * Supports HTTP streaming response, Suspense boundaries, async component streaming
 */

import { h, type VNode, type ComponentInstance } from '@upfault/runtime';
import { Priority, type SchedulerTask } from '@upfault/scheduler';
import { VNodeType } from '@upfault/shared';

export interface StreamingOptions {
  bootstrapScripts?: string[];
  inlineStyles?: boolean;
  preloadModules?: boolean;
  suspenseFallback?: string;
  onShellReady?: () => void;
  onAllReady?: () => void;
  onError?: (error: Error) => void;
}

export interface StreamRenderer {
  render(vnode: VNode): ReadableStream;
  pipeToNodeWritable(writable: NodeJS.WritableStream): Promise<void>;
  pipeToWebWritable(writable: WritableStream): Promise<void>;
  abort(): void;
}

export interface SuspenseBoundary {
  fallback: VNode | string | (() => VNode | string);
  onResolve?: (data: any) => void;
  onReject?: (error: Error) => void;
  timeout?: number;
}

/**
 * Create streaming renderer
 */
export function createStreamRenderer(options: StreamingOptions = {}): StreamRenderer {
  let aborted = false;
  let shellSent = false;
  
  return {
    render(vnode: VNode): ReadableStream {
      return new ReadableStream({
        async start(controller) {
          try {
            if (!shellSent) {
              const shell = renderShell(vnode);
              controller.enqueue(new TextEncoder().encode(shell));
              shellSent = true;
            }
            
            await renderStreaming(vnode, (chunk) => {
              controller.enqueue(new TextEncoder().encode(chunk));
            });
            
            controller.enqueue(new TextEncoder().encode('<!--stream-end-->'));
            controller.close();
          } catch (err) {
            controller.error(err);
          }
        },
      });
    },
    async pipeToNodeWritable(writable: NodeJS.WritableStream): Promise<void> {
      const stream = this.render({ type: VNodeType.ELEMENT, tag: 'div', props: {}, children: [] } as any);
      const reader = stream.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          await new Promise<void>((resolve, reject) => {
            writable.write(value, (err) => err ? reject(err) : resolve());
          });
        }
      } finally {
        reader.releaseLock();
        writable.end();
      }
    },
    async pipeToWebWritable(writable: WritableStream): Promise<void> {
      const stream = this.render({ 
        type: VNodeType.ELEMENT, 
        tag: 'div', 
        props: {}, 
        children: [] 
      } as any);
      await stream.pipeTo(writable);
    },
    abort() {
      aborted = true;
    },
  };
}

/**
 * Render to pipeable stream
 */
export function renderToPipeableStream(
  vnode: VNode,
  options: StreamingOptions = {}
): ReadableStream {
  const renderer = createStreamRenderer(options);
  return renderer.render(vnode);
}

/**
 * Render to Web ReadableStream
 */
export function renderToReadableStream(
  vnode: VNode,
  options: StreamingOptions = {}
): ReadableStream {
  const renderer = createStreamRenderer(options);
  return renderer.render(vnode);
}

/**
 * Render HTML Shell (initial framework)
 */
function renderShell(vnode: VNode): string {
  const headHtml = extractHead(vnode);
  const bodyHtml = extractBody(vnode);
  
  return '<!DOCTYPE html>\n<html>\n<head>\n' + headHtml + '\n</head>\n<body>\n' + bodyHtml + '\n</body>\n</html>';
}

function extractHead(vnode: VNode): string {
  if (typeof vnode === 'object' && vnode && (vnode as any).type === VNodeType.ELEMENT && (vnode as any).tag === 'head') {
    return renderVNodeToString(vnode);
  }
  return '';
}

function extractBody(vnode: VNode): string {
  if (typeof vnode === 'object' && vnode && (vnode as any).type === VNodeType.ELEMENT && (vnode as any).tag === 'body') {
    return renderVNodeToString(vnode);
  }
  return renderVNodeToString(vnode);
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
  
  const tag = typeof (vnode as any).type === 'string' ? (vnode as any).type : 'div';
  const props = (vnode as any).props || {};
  const children = (vnode as any).children as VNode[];
  
  const attrs = Object.entries(props)
    .filter(([k, v]) => k !== 'children' && v != null && v !== false && !k.startsWith('on'))
    .map(([k, v]) => {
      if (v === true) return k;
      return k + '="' + escapeHtml(String(v)) + '"';
    })
    .join(' ');
  
  const childrenHtml = Array.isArray(children)
    ? children.map(renderVNodeToString).join('')
    : typeof children === 'string'
      ? escapeHtml(children)
      : '';
  
  const voidTags = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
  
  if (voidTags.has(tag)) {
    return '<' + tag + (attrs ? ' ' + attrs : '') + '>';
  }
  
  return '<' + tag + (attrs ? ' ' + attrs : '') + '>' + childrenHtml + '</' + tag + '>';
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, '&apos;');
}

async function renderStreaming(vnode: VNode, onChunk: (chunk: string) => void): Promise<void> {
  const html = renderVNodeToString(vnode);
  const chunkSize = 4096;