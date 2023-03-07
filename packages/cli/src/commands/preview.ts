/**
 * Preview 命令 - 预览生产构建
 */

import { serve } from 'esbuild';
import { resolve } from 'path';
import { existsSync } from 'fs';
import pc from 'picocolors';

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
  console.log(pc.gray(`监听地址: http://${host}:${options.port || 4173}`));

  try {
    // For preview, we just serve static files - pass empty build options
    const server = await serve({
      servedir: distDir,
      port: options.port || 4173,
      host: options.host || 'localhost',
    }, {
      entryPoints: [], // No entry points for static serving
      bundle: false,
      outdir: distDir,
      platform: 'browser',
      format: 'esm',
    });

    console.log(pc.green(`✅ 预览服务器已启动: http://${host}:${port}`));
    console.log(pc.gray('按 Ctrl+C 停止服务器'));