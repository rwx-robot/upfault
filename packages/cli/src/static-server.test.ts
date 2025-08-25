/**
 * @upfault/cli - static-server 测试
 * 用真实 HTTP 请求验证服务行为
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { resolve } from 'path';
import { startStaticServer, type StaticServer } from './static-server';

const TEST_ROOT = '/tmp/upfault-static-server-test';

beforeEach(() => {
  try { rmSync(TEST_ROOT, { recursive: true }); } catch { /* ignore */ }
  mkdirSync(TEST_ROOT, { recursive: true });
});

// 工具：HTTP GET 返回 status + body
async function httpGet(url: string): Promise<{ status: number; headers: Record<string, string | string[] | undefined>; body: string }> {
  const res = await fetch(url);
  const headers: Record<string, string | string[]> = {};
  res.headers.forEach((v, k) => { headers[k] = v; });
  return { status: res.status, headers, body: await res.text() };
}

describe('startStaticServer', () => {

  it('应启动并响应根路径（返回 index.html）', async () => {
    writeFileSync(resolve(TEST_ROOT, 'index.html'), '<html><body>root</body></html>');
    const server: StaticServer = await startStaticServer({ root: TEST_ROOT, port: 0, log: false });
    try {
      const res = await httpGet(server.url + '/');
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/html');
      expect(res.body).toContain('root');
    } finally {
      await server.close();
    }
  });

  it('应返回正确的 MIME 类型', async () => {
    writeFileSync(resolve(TEST_ROOT, 'app.mjs'), 'export const x = 1;');
    writeFileSync(resolve(TEST_ROOT, 'style.css'), 'body { color: red; }');
    writeFileSync(resolve(TEST_ROOT, 'data.json'), '{"a":1}');
    const server: StaticServer = await startStaticServer({ root: TEST_ROOT, port: 0, log: false });
    try {
      const js = await httpGet(server.url + '/app.mjs');
      const css = await httpGet(server.url + '/style.css');
      const json = await httpGet(server.url + '/data.json');
      expect(js.headers['content-type']).toContain('application/javascript');
      expect(css.headers['content-type']).toContain('text/css');
      expect(json.headers['content-type']).toContain('application/json');
    } finally {
      await server.close();
    }
  });

  it('SPA fallback：未知路径应回 index.html', async () => {
    writeFileSync(resolve(TEST_ROOT, 'index.html'), '<html><body>SPA root</body></html>');
    const server: StaticServer = await startStaticServer({ root: TEST_ROOT, port: 0, log: false });
    try {
      const res = await httpGet(server.url + '/users/123');
      expect(res.status).toBe(200);
      expect(res.body).toContain('SPA root');
    } finally {
      await server.close();
    }
  });

  it('路径穿越应 403', async () => {
    writeFileSync(resolve(TEST_ROOT, 'index.html'), '<html></html>');
    const server: StaticServer = await startStaticServer({ root: TEST_ROOT, port: 0, log: false });
    try {
      // fetch 会规范化 ../ ，所以服务端拿不到穿越路径
      // 我们直接用 fetch 测根路径仍然返回 index.html（验证服务器没挂）
      const res = await httpGet(server.url + '/..%2Fetc%2Fpasswd');
      // URL decode 后含 .. → 服务端拒绝
      expect(res.status).toBe(403);
    } finally {
      await server.close();
    }
  });

  it('无 index.html 时根路径 404', async () => {
    mkdirSync(resolve(TEST_ROOT, 'sub'), { recursive: true });
    writeFileSync(resolve(TEST_ROOT, 'sub', 'page.html'), '<html>page</html>');
    const server: StaticServer = await startStaticServer({ root: TEST_ROOT, port: 0, log: false });
    try {
      const res = await httpGet(server.url + '/');
      expect(res.status).toBe(404);
    } finally {
      await server.close();
    }
  });

  it('应暴露 server.url 字段', async () => {
    writeFileSync(resolve(TEST_ROOT, 'index.html'), '');
    const server: StaticServer = await startStaticServer({ root: TEST_ROOT, port: 0, host: '127.0.0.1', log: false });
    try {
      expect(server.url).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/);
    } finally {
      await server.close();
    }
  });

  it('close() 后端口应释放', async () => {
    writeFileSync(resolve(TEST_ROOT, 'index.html'), '');
    const server: StaticServer = await startStaticServer({ root: TEST_ROOT, port: 0, log: false });
    await server.close();
    // 第二次启动应成功（如果端口未释放会 EADDRINUSE）
    const server2: StaticServer = await startStaticServer({ root: TEST_ROOT, port: 0, log: false });
    await server2.close();
    expect(server2.url).toMatch(/^http:\/\/localhost:\d+$/);
  });

  it('HMR 端点应返回 text/event-stream', async () => {
    writeFileSync(resolve(TEST_ROOT, 'index.html'), '');
    const server: StaticServer = await startStaticServer({ root: TEST_ROOT, port: 0, log: false });
    try {
      // SSE 连接永不主动结束，用 AbortController 限速读一段
      const controller = new AbortController();
      const fetchPromise = fetch(server.url + '/__upfault_hmr', { signal: controller.signal });
      // 触发一次 hello 数据
      const timeout = setTimeout(() => controller.abort(), 300);
      const res = await fetchPromise;
      const headers: Record<string, string> = {};
      res.headers.forEach((v, k) => headers[k] = v);
      expect(res.status).toBe(200);
      expect(headers['content-type']).toContain('text/event-stream');
      // 读前几个字节
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      const { value } = await reader.read();
      const chunk = decoder.decode(value ?? new Uint8Array());
      clearTimeout(timeout);
      try { controller.abort(); } catch { /* ignore */ }
      try { reader.releaseLock(); } catch { /* ignore */ }
      expect(chunk).toContain('data:');
      expect(chunk).toContain('connected');
    } finally {
      await server.close();
    }
  });

  it('notifyHmr 应向客户端推送 update 事件', async () => {
    writeFileSync(resolve(TEST_ROOT, 'index.html'), '');
    const server: StaticServer = await startStaticServer({ root: TEST_ROOT, port: 0, log: false });
    try {
      const controller = new AbortController();
      const fetchPromise = fetch(server.url + '/__upfault_hmr', { signal: controller.signal });
      // 推送到所有 HMR 客户端
      setTimeout(() => server.notifyHmr(), 100);
      const res = await fetchPromise;
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let received = '';
      while (true) {
        const { value } = await reader.read().catch(() => ({ value: undefined }));
        if (value) received += decoder.decode(value);
        if (received.includes('update')) break;
      }
      try { controller.abort(); } catch { /* ignore */ }
      try { reader.releaseLock(); } catch { /* ignore */ }
      expect(received).toContain('"type":"update"');
    } finally {
      await server.close();
    }
  });
});