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
  if (!existsSync(outPath)) {
    mkdirSync(outPath, { recursive: true });
  }

  try {
    // 入口文件
    const entryPoints = findEntryPoints(cwd, config);
    
    if (entryPoints.length === 0) {
      console.error(pc.red('❌ 未找到入口文件'));
      console.log(pc.yellow('请确保项目中有 index.html 或 main.ts 文件'));
      process.exit(1);
    }

    console.log(pc.gray(`入口文件: ${entryPoints.join(', ')}`));

    // 构建配置
    const buildOptions: any = {
      entryPoints,
      bundle: true,
      outdir: outPath,
      platform: 'browser',
      format: 'esm',
      target: 'es2020',
      minify,
      sourcemap,
      splitting: true,
      outExtension: { '.js': '.mjs', '.css': '.css' },
      loader: {
        '.ts': 'ts',
        '.tsx': 'tsx',
        '.vue': 'text',
        '.css': 'css',
        '.json': 'json',
      },
      define: {
        'process.env.NODE_ENV': '"production"',
        'process.env.UPF_VERSION': JSON.stringify(config.version || '0.2.0'),
      },
      external: ['@upfault/runtime', '@upfault/reactivity', '@upfault/shared', '@upfault/diff', '@upfault/scheduler'],
      plugins: [
        // 自定义插件
        {
          name: 'upfault-progress',
          setup(build) {
            build.onStart(() => {
              console.log(pc.blue('⏳ 正在打包...'));
            });
            build.onEnd((result) => {
              if (result.errors.length > 0) {
                console.error(pc.red('❌ 构建失败:'));
                result.errors.forEach(e => console.error(pc.red(`  ${e.text}`)));
              } else {
                console.log(pc.green('✅ 构建成功!'));
                printBuildStats(result);
              }