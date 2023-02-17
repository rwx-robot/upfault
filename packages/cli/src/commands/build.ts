/**
 * Build 命令 - 构建生产环境包
 */

import { build as esbuildBuild } from 'esbuild';
import { resolve, relative } from 'path';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import pc from 'picocolors';

export interface BuildOptions {
  outDir?: string;
  minify?: boolean;
  sourcemap?: boolean;
  config?: string;
}

export async function build(options: BuildOptions = {}): Promise<void> {
  const cwd = process.cwd();
  const outDir = options.outDir || 'dist';
  const minify = options.minify ?? true;
  const sourcemap = options.sourcemap ?? true;

  console.log(pc.cyan('🔨 开始构建...'));
  console.log(pc.gray(`工作目录: ${cwd}`));
  console.log(pc.gray(`输出目录: ${outDir}`));

  // 读取配置
  const config = await loadConfig(options.config);
  
  // 确保输出目录存在
  const outPath = resolve(cwd, outDir);