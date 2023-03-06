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
