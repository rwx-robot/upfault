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
  
  return async function ssrMiddleware(
    req: SSRRequest,
    res: SSRResponse,
    next?: () => Promise<void>
  ): Promise<void> {
    const startTime = Date.now();
    
    try {
      if (onRequest) await onRequest(req);
      
      const matchedRoute = compiledRoutes.find(route => route.regex.test(req.url));
      
      if (matchedRoute) {
        const pageData = await matchedRoute.handler(req);
        
        const vnode = pageData.vnode || pageData.default?.();
        
        if (!vnode) {
          throw new Error('Route handler must return a VNode');
        }
        
        const renderOpts: any = {
          ...renderOptions,
          context: {
            ...renderOptions.context,
            meta: {
              title: pageData.title || 'UpFault App',
              description: pageData.description || '',
              ...pageData.meta,
            },
            state: {
              ...renderOptions.context?.state,
              ...pageData.state,
            },
          },
        };
        
        let html: string;
        
        if (streaming) {
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.setHeader('Transfer-Encoding', 'chunked');
          res.setHeader('X-Content-Type-Options', 'nosniff');
          
          const { renderToNodeStream } = await import('./render');
          const stream = renderToNodeStream(vnode, renderOpts);
          
          for await (const chunk of stream) {
            res.write(String(chunk));
          }
          res.end();
        } else {
          const { renderToString } = await import('./render');
          html = renderToString(vnode, renderOpts);
          
          if (onResponse) {
            html = await onResponse(html, req, res);
          }
          
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.setHeader('X-Response-Time', String(Date.now() - startTime) + 'ms');
          res.send(html);
        }
        
        return;
      }
      
      if (req.url.startsWith(staticPrefix)) {
        if (next) await next();
        return;
      }
      
      res.status(404);
      const { renderToString } = await import('./render');
      const h1 = h('h1', null, '404 - Not Found');
      const hp = h('p', null, 'Page not found: ' + req.url);
      const notFoundHtml = renderToString(h('div', { class: 'not-found' }, [h1, hp]));
      res.send(notFoundHtml);