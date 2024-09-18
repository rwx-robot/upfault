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
  
  for (let i = 0; i < html.length; i += chunkSize) {
    if (aborted) throw new Error('Stream aborted');
    onChunk(html.slice(i, i + chunkSize));
    await new Promise(resolve => setImmediate(resolve));
  }
}

let aborted = false;

interface AsyncComponentInstance {
  resolve(): Promise<any>;
  render(props: any, context: any): Promise<any>;
}

/**
 * Suspense component - supports async boundaries
 */
export function Suspense(props: {
  fallback?: VNode | string | (() => VNode | string);
  children: VNode | VNode[];
  onResolve?: (data: any) => void;
  onReject?: (error: Error) => void;
  timeout?: number;
  suspenseKey?: string;
}): VNode {
  return {
    type: VNodeType.SUSPENSE,
    tag: 'suspense',
    props: {
      fallback: props.fallback,
      children: props.children,
      onResolve: props.onResolve,
      onReject: props.onReject,
      timeout: props.timeout,
      suspenseKey: props.suspenseKey,
    },
    children: Array.isArray(props.children) ? props.children : [props.children],
    key: null,
    flags: 0,
    el: null,
    parent: null,
    component: null,
    block: null,
    patchFlag: 0,
    dynamicProps: null,
  } as any;
}

/**
 * Define async component
 */
export function defineAsyncComponent(
  loader: () => Promise<{ default: any }>,
  options: {
    loadingComponent?: VNode;
    errorComponent?: VNode;
    delay?: number;
    timeout?: number;
    suspense?: boolean;
    onError?: (error: Error, retry: () => void) => void;
  } = {}
): any {
  let component: any = null;
  let loading = false;
  let error: Error | null = null;
  let retries = 0;
  
  const AsyncComponent = {
    type: 'AsyncComponent',
    loader,
    options,
    isAsync: true,
    
    async resolve(this: AsyncComponentInstance): Promise<any> {
      if (component) return component;
      
      if (loading) {
        await new Promise(resolve => setTimeout(resolve, 50));
        return this.resolve();
      }
      
      loading = true;
      
      try {
        const mod = await loader();
        component = mod.default;
        return component;
      } catch (err) {
        error = err as Error;
        throw err;
      } finally {
        loading = false;
      }
    },
    
    async render(this: AsyncComponentInstance, props: any, context: any) {
      try {
        const comp = await this.resolve();
        if (comp) {
          return typeof comp === 'function' 
            ? comp(props) 
            : (comp.render ? comp.render() : h('div', null, 'Loaded'));
        }
      } catch (err) {
        if (options.errorComponent) {
          return options.errorComponent;
        }
        return h('div', { class: 'async-error' }, 'Error: ' + (err as Error).message);
      }
      
      if (options.loadingComponent) {
        return options.loadingComponent;
      }
      
      return h('div', { class: 'async-loading' }, 'Loading...');
    },
  };
  
  return AsyncComponent;
}

/**
 * Teleport component
 */
export function Teleport(props: {
  to: string | Element;
  children: VNode | VNode[];
  disabled?: boolean;
}): VNode {
  return {
    type: VNodeType.TELEPORT,
    tag: 'teleport',
    props: {
      to: props.to,
      children: props.children,
      disabled: props.disabled || false,
    },
    children: Array.isArray(props.children) ? props.children : [props.children],
    key: null,
    flags: 0,
    el: null,
    parent: null,
    component: null,
    block: null,
    patchFlag: 0,
    dynamicProps: null,
  } as any;
}

/**
 * KeepAlive component
 */
export function KeepAlive(props: {
  children: VNode;
  include?: string | RegExp | (string | RegExp)[];
  exclude?: string | RegExp | (string | RegExp)[];
  max?: number;
}): VNode {
  return {
    type: VNodeType.KEEPALIVE,
    tag: 'keepalive',
    props: {
      children: props.children,
      include: props.include,
      exclude: props.exclude,
      max: props.max,
    },
    children: props.children,
    key: null,
    flags: 0,
    el: null,
    parent: null,
    component: null,
    block: null,
    patchFlag: 0,
    dynamicProps: null,
  } as any;
}

/**
 * Create async component factory
 */
export function createAsyncComponent(
  loader: () => Promise<{ default: any }>,
  options: {
    loadingComponent?: VNode;
    errorComponent?: VNode;
    delay?: number;
    timeout?: number;
    suspense?: boolean;
    onError?: (error: Error, retry: () => void) => void;
  } = {}
): any {
  let component: any = null;
  let loading = false;
  let error: Error | null = null;
  let retries = 0;
  
  const AsyncComponent = {
    type: 'AsyncComponent',
    loader,
    options,
    isAsync: true,
    
    async resolve(this: AsyncComponentInstance): Promise<any> {
      if (component) return component;
      
      if (loading) {
        await new Promise(resolve => setTimeout(resolve, 50));
        return this.resolve();
      }
      
      loading = true;
      
      try {
        const mod = await loader();
        component = mod.default;
        return component;
      } catch (err) {
        error = err as Error;
        throw err;
      } finally {
        loading = false;
      }
    },
    
    async render(this: AsyncComponentInstance, props: any, context: any) {
      try {
        const comp = await this.resolve();
        if (comp) {
          return typeof comp === 'function' 
            ? comp(props) 
            : (comp.render ? comp.render() : h('div', null, 'Loaded'));
        }
      } catch (err) {
        if (options.errorComponent) {
          return options.errorComponent;
        }
        return h('div', { class: 'async-error' }, 'Error: ' + (err as Error).message);
      }
      
      if (options.loadingComponent) {
        return options.loadingComponent;
      }
      
      return h('div', { class: 'async-loading' }, 'Loading...');
    },
  };
  
  return AsyncComponent;
}

/**
 * Create KeepAlive cache
 */
export function createKeepAliveCache(maxSize: number = 10): Map<string, any> {
  const cache = new Map<string, any>();
  const order: string[] = [];
  
  const extendedCache: Map<string, any> = new Proxy(cache, {
    get(target, prop, receiver) {
      if (prop === 'set') {
        return function(key: string, instance: any): Map<string, any> {
          if (target.has(key)) {
            const idx = order.indexOf(key);
            if (idx > -1) order.splice(idx, 1);
          } else if (target.size >= maxSize) {
            const oldest = order.shift();
            if (oldest) target.delete(oldest);
          }
          target.set(key, instance);
          order.push(key);
          return target;
        };
      }
      return Reflect.get(target, prop, receiver);
    }
  });
  
  return extendedCache;
}

/**
 * Match KeepAlive rules
 */
export function matchesKeepAlive(
  name: string,
  include?: string | RegExp | (string | RegExp)[],
  exclude?: string | RegExp | (string | RegExp)[]
): boolean {
  if (include) {
    const includes = Array.isArray(include) ? include : [include];
    if (!includes.some(pattern => matchPattern(name, pattern))) {
      return false;
    }
  }
  
  if (exclude) {
    const excludes = Array.isArray(exclude) ? exclude : [exclude];
    if (excludes.some(pattern => matchPattern(name, pattern))) {
      return false;
    }
  }
  
  return true;
}

function matchPattern(name: string, pattern: string | RegExp): boolean {
  if (typeof pattern === 'string') {
    return name === pattern || name.includes(pattern);
