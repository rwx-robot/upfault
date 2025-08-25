/**
 * Preview 命令 - 预览生产构建（静态文件 HTTP server）
 *
 * esbuild 0.20+ 已移除 serve()，改用 cli 自己的静态文件服务器（见 static-server.ts）
 */

import { resolve } from 'path';
import { existsSync } from 'fs';
import pc from 'picocolors';
import { startStaticServer } from '../static-server';

export interface PreviewOptions {
  port?: number;
  host?: string;
  config?: string;
}

export async function preview(options: PreviewOptions = {}): Promise<void> {
  const cwd = process.cwd();
  const port = options.port || 4173;
  const host = options.host || 'localhost';
  const distDir = resolve(cwd, 'dist');

  console.log(pc.cyan('🔍 启动预览服务器...'));

  if (!existsSync(distDir)) {
    console.error(pc.red('❌ 未找到 dist 目录'));
    console.log(pc.yellow('请先运行 `upfault build` 构建项目'));
    process.exit(1);
  }

  console.log(pc.gray(`服务目录: ${distDir}`));
  console.log(pc.gray(`监听地址: http://${host}:${port}`));

  const server = await startStaticServer({
    root: distDir,
    port,
    host,
    defaultFile: 'index.html',
    log: true,
  });

  console.log(pc.green(`✅ 预览服务器已启动: ${server.url}`));
  console.log(pc.gray('按 Ctrl+C 停止服务器'));

  process.on('SIGINT', async () => {
    console.log(pc.cyan('\n🛑 正在关闭预览服务器...'));
    await server.close();
    console.log(pc.gray('预览服务器已停止'));
    process.exit(0);
  });
}