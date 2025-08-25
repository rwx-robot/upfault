/**
 * UpFault CLI - 静态文件 HTTP 服务器（无外部依赖，仅用 Node 内置模块）
 *
 * 用于 dev 和 preview 命令。dev 模式下额外暴露 /__upfault_hmr SSE 端点
 * 用于热更新通知（客户端由 cli runtime 注入）。
 */

import { createServer, type IncomingMessage, type ServerResponse } from 'http';
import { stat, readFile } from 'fs/promises';
import { resolve, extname, normalize } from 'path';
import { createReadStream, existsSync } from 'fs';
import pc from 'picocolors';

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json',
};

export interface StaticServerOptions {
  /** 静态文件根目录（绝对路径） */
  root: string;
  /** 默认文件（默认 index.html） */
  defaultFile?: string;
  /** 监听端口 */
  port: number;
  /** 监听主机 */
  host?: string;
  /** 是否输出请求日志 */
  log?: boolean;
  /** 热更新事件回调（dev 模式用于 SSE 推送给浏览器） */
  onHmr?: () => void;
}

export interface StaticServer {
  /** 关闭服务器 */
  close(): Promise<void>;
  /** 服务器地址 */
  url: string;
  /** 通知 HMR 客户端刷新 */
  notifyHmr(): void;
}

/**
 * 启动静态文件 HTTP 服务器。
 * 支持 SPA fallback（找不到文件时回 index.html）。
 */
export function startStaticServer(options: StaticServerOptions): Promise<StaticServer> {
  const root = normalize(options.root);
  const defaultFile = options.defaultFile ?? 'index.html';
  const host = options.host ?? 'localhost';
  const log = options.log ?? true;

  // HMR 客户端连接池
  const hmrClients: Set<ServerResponse> = new Set();

  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    try {
      const url = new URL(req.url ?? '/', `http://${host}:${options.port}`);
      let pathname = decodeURIComponent(url.pathname);
      if (pathname.endsWith('/')) pathname += defaultFile;

      // 路径安全：禁止 ../
      if (pathname.includes('..')) {
        res.writeHead(403, { 'content-type': 'text/plain' });
        res.end('Forbidden');
        return;
      }

      const filePath = resolve(root, pathname.startsWith('/') ? pathname.slice(1) : pathname);

      // HMR SSE 端点
      if (pathname === '/__upfault_hmr') {
        res.writeHead(200, {
          'content-type': 'text/event-stream',
          'cache-control': 'no-cache',
          'connection': 'keep-alive',
        });
        hmrClients.add(res);
        // 初次连接发送 hello
        res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);
        req.on('close', () => hmrClients.delete(res));
        return;
      }

      let target = filePath;
      if (!existsSync(target)) {
        // SPA fallback
        const fallback = resolve(root, defaultFile);
        if (existsSync(fallback)) target = fallback;
        else {
          res.writeHead(404, { 'content-type': 'text/plain' });
          res.end('Not Found');
          if (log) console.log(pc.gray(`  ${req.method} ${pathname} → 404`));
          return;
        }
      }

      const ext = extname(target).toLowerCase();
      const mime = MIME_TYPES[ext] ?? 'application/octet-stream';
      const stats = await stat(target);

      // CORS
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('content-type', mime);

      if (log) console.log(pc.gray(`  ${req.method} ${pathname} → ${stats.size}B`));

      if (req.method === 'HEAD') {
        res.writeHead(200);
        res.end();
        return;
      }

      res.writeHead(200);
      // 流式输出大文件
      const stream = createReadStream(target);
      stream.pipe(res);
      stream.on('error', () => {
        res.writeHead(500, { 'content-type': 'text/plain' });
        res.end('Read Error');
      });
    } catch (err: any) {
      try {
        res.writeHead(500, { 'content-type': 'text/plain' });
        res.end(`Server Error: ${err?.message ?? String(err)}`);
      } catch { /* response already sent */ }
    }
  });

  return new Promise((resolvePromise, reject) => {
    server.once('error', reject);
    server.listen(options.port, host, () => {
      // port=0 时由系统自动分配，用 server.address() 拿真实端口
      const addr = server.address();
      const actualPort = (typeof addr === 'object' && addr) ? addr.port : options.port;
      const url = `http://${host}:${actualPort}`;
      const instance: StaticServer = {
        url,
        close: () => new Promise<void>((closeResolve, closeReject) => {
          for (const client of hmrClients) {
            try { client.end(); } catch { /* ignore */ }
          }
          hmrClients.clear();
          server.close(err => err ? closeReject(err) : closeResolve());
        }),
        notifyHmr: () => {
          const payload = `data: ${JSON.stringify({ type: 'update', ts: Date.now() })}\n\n`;
          for (const client of hmrClients) {
            try { client.write(payload); } catch { /* ignore */ }
          }
        },
      };
      resolvePromise(instance);
    });
  });
}