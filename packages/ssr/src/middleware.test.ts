/**
 * @upfault/ssr - middleware 模块测试
 */

import { describe, it, expect, vi } from 'vitest';
import { h } from '@upfault/runtime';
import {
  createSSRMiddleware,
  createExpressMiddleware,
  createKoaMiddleware,
  createFastifyMiddleware,
  createNodeHttpHandler,
  createDevMiddleware,
  createProdMiddleware,
  type SSRRequest,
  type SSRResponse,
} from './middleware';

// 构造最小可用的 req/res mock
function mockReqRes(url = '/') {
  const req: Partial<SSRRequest> = {
    url,
    method: 'GET',
    headers: {},
    body: null,
  };
  const chunks: string[] = [];
  const headers: Record<string, string> = {};
  let statusCode = 200;
  const res: Partial<SSRResponse> = {
    statusCode: 200,
    setHeader(name: string, value: string) { headers[name.toLowerCase()] = value; },
    getHeader(name: string) { return headers[name.toLowerCase()]; },
    write(chunk: any) { chunks.push(String(chunk)); return true; },
    end(chunk?: any) {
      if (chunk != null) chunks.push(String(chunk));
      statusCode = 200;
    },
    send(body: any) {
      chunks.push(typeof body === 'string' ? body : JSON.stringify(body));
    },
    status(code: number) { statusCode = code; return res as SSRResponse; },
    json(body: any) { chunks.push(JSON.stringify(body)); },
    _getBody: () => chunks.join(''),
    _getStatus: () => statusCode,
  };
  return { req: req as SSRRequest, res: res as SSRResponse, getBody: () => chunks.join(''), getStatus: () => statusCode };
}

describe('createSSRMiddleware', () => {

  it('应返回中间件函数', () => {
    const mw = createSSRMiddleware();
    expect(typeof mw).toBe('function');
  });

  it('路由命中时应调用 handler 并渲染返回的 vnode', async () => {
    const handler = vi.fn(async (req: SSRRequest) => ({
      vnode: h('div', { class: 'hit' }, 'hit-content'),
      title: 'Hit Page',
    }));
    const mw = createSSRMiddleware({
      routes: [{ pattern: '/page', handler }],
    });
    const { req, res, getBody } = mockReqRes('/page');
    await mw(req, res);
    expect(handler).toHaveBeenCalled();
    expect(getBody()).toContain('hit-content');
  });

  it('无路由匹配时应输出 404', async () => {
    const mw = createSSRMiddleware({ routes: [] });
    const { req, res, getBody } = mockReqRes('/no-match');
    await mw(req, res);
    expect(getBody()).toContain('404');
  });
});

describe('createExpressMiddleware', () => {

  it('应返回 express 风格 (req, res, next) 中间件', () => {
    const mw = createExpressMiddleware({ render: async () => '' });
    expect(mw.length).toBe(3); // req, res, next
  });
});

describe('createKoaMiddleware', () => {

  it('应返回 koa 风格 (ctx, next) 中间件', () => {
    const mw = createKoaMiddleware({ render: async () => '' });
    expect(mw.length).toBe(2); // ctx, next
  });
});

describe('createFastifyMiddleware', () => {

  it('应返回 fastify 风格 hook', () => {
    const hook = createFastifyMiddleware({ render: async () => '' });
    expect(typeof hook).toBe('function');
  });
});

describe('createNodeHttpHandler', () => {

  it('应返回 Node http requestListener', () => {
    const handler = createNodeHttpHandler({ render: async () => '' });
    expect(typeof handler).toBe('function');
    expect(handler.length).toBe(2); // req, res
  });
});

describe('createDevMiddleware', () => {

  it('应返回中间件函数', () => {
    const mw = createDevMiddleware({ render: async () => '' });
    expect(typeof mw).toBe('function');
  });
});

describe('createProdMiddleware', () => {

  it('应返回中间件函数', () => {
    const mw = createProdMiddleware({ render: async () => '' });
    expect(typeof mw).toBe('function');
  });

  it('prod 中间件路由命中时输出渲染结果', async () => {
    const handler = vi.fn(async (req: SSRRequest) => ({
      vnode: h('div', null, 'prod-content'),
      title: 'Prod Page',
    }));
    const mw = createProdMiddleware({
      routes: [{ pattern: '/prod', handler }],
    });
    const { req, res, getBody } = mockReqRes('/prod');
    await mw(req, res);
    expect(getBody()).toContain('prod-content');
  });
});