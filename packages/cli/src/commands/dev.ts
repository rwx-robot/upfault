/**
 * Dev 命令 - 启动开发服务器
 */

import { build as esbuildBuild } from 'esbuild';
import { serve } from 'esbuild';
import chokidar from 'chokidar';
import { resolve, relative } from 'path';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import pc from 'picocolors';
import { loadConfig, findEntryPoints, copyPublicAssets, generateIndexHtml } from './build';

export interface DevOptions {
  port?: number;
  open?: boolean;
  host?: string;
  config?: string;
}

export async function dev(options: DevOptions = {}): Promise<void> {
  const cwd = process.cwd();
  const port = options.port || 3000;
  const host = options.host || 'localhost';
  const open = options.open || false;

  console.log(pc.cyan('🚀 启动开发服务器...'));
  console.log(pc.gray(`监听地址: http://${host}:${port}`));

  const config = await loadConfig(options.config);
  const entryPoints = findEntryPoints(cwd, config);

  if (entryPoints.length === 0) {
    console.error(pc.red('❌ 未找到入口文件'));
    process.exit(1);
  }

  // 确保输出目录存在
  const outDir = resolve(cwd, '.upfault-dev');
  if (!existsSync(outDir)) {
    mkdirSync(outDir, { recursive: true });
  }

  // 复制静态资源
  if (config.publicDir) {
    copyPublicAssets(cwd, config.publicDir, outDir);
  }

  // 生成 index.html
  generateIndexHtml(cwd, outDir, config, entryPoints);

  try {