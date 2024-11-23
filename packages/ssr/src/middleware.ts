/**
 * UpFault SSR - Middleware Integration
 * 
 * Provides Express, Koa, Fastify, and native Node.js HTTP server SSR middleware
 */

import { renderToString, renderToNodeStream, pipeToNodeWritable, type SSRContext, type RenderOptions } from './render';
import { h } from '@upfault/runtime';

export interface SSRRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  query: Record<string, string>;
  params: Record<string, string>;
  body?: any;
}

export interface SSRResponse {
  status(code: number): this;
  setHeader(name: string, value: string): this;
  send(html: string): void;
  write(chunk: string): void;
  end(chunk?: string): void;
  pipe(stream: NodeJS.ReadableStream): this;
}

export interface MiddlewareOptions {
  renderOptions?: RenderOptions;
  render?: (vnode: any, options: any) => Promise<string>;
  routes?: Array<{
    pattern: string | RegExp;
    handler: (req: SSRRequest) => Promise<any> | any;
  }>;
  streaming?: boolean;
  staticPrefix?: string;
  onError?: (error: Error, req: SSRRequest, res: SSRResponse) => void;
  onRequest?: (req: SSRRequest) => Promise<void> | void;
  onResponse?: (html: string, req: SSRRequest, res: SSRResponse) => Promise<string> | string;
}

function pathToRegex(pattern: string): RegExp {
  const regexPattern = pattern
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.')
    .replace(/:([^/]+)/g, '([^/]+)');
  return new RegExp('^' + regexPattern + '$');
}

function parseQuery(url: string): Record<string, string> {
  const query: Record<string, string> = {};
  const queryString = url.split('?')[1] || '';
  for (const pair of queryString.split('&')) {
    const [key, value] = pair.split('=');
    if (key) query[decodeURIComponent(key)] = decodeURIComponent(value || '');
  }
  return query;
}

export function createSSRMiddleware(options: MiddlewareOptions = {}) {
  const {
    renderOptions = {},
    render: customRender,
    routes = [],
    streaming = false,
    staticPrefix = '/static/',
    onError,
    onRequest,
    onResponse,
  } = options;
  
  const compiledRoutes = routes.map((route) => {
    return {
      regex: route.pattern instanceof RegExp ? route.pattern : pathToRegex(route.pattern),
      handler: route.handler,
    };
  });
  