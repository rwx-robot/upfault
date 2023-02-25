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
    // 启动 esbuild 开发服务器
    const server = await serve({
      servedir: outDir,
      port,
      host,
      onRequest: (args: any) => {
        // 开发模式下的请求日志
        console.log(pc.gray(`  ${args.method} ${args.path}`));
      },
    }, {
      entryPoints,
      bundle: true,
      outdir: outDir,
      platform: 'browser',
      format: 'esm',
      target: 'es2020',
      sourcemap: 'inline',
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
        'process.env.NODE_ENV': '"development"',
        'process.env.UPF_VERSION': JSON.stringify(config.version || '0.2.0'),
      },
      external: ['@upfault/runtime', '@upfault/reactivity', '@upfault/shared', '@upfault/diff', '@upfault/scheduler'],
      plugins: [
        {
          name: 'upfault-hmr',
          setup(build) {
            build.onStart(() => {
              console.log(pc.blue('🔄 重新构建...'));
            });
            build.onEnd((result) => {
              if (result.errors.length > 0) {
                console.error(pc.red('❌ 构建错误:'));
                result.errors.forEach(e => console.error(pc.red(`  ${e.text}`)));
              } else {
                console.log(pc.green('✅ 热更新完成'));
              }
            });
          },
        },
      ],
    });

    console.log(pc.green(`✅ 开发服务器已启动: http://${host}:${port}`));
    console.log(pc.gray('按 Ctrl+C 停止服务器'));

    // 监听文件变化（用于 HMR 触发）
    const watcher = chokidar.watch([
      resolve(cwd, 'src/**/*'),
      resolve(cwd, 'index.html'),
      resolve(cwd, 'public/**/*'),
    ], {
      ignored: /(^|[/\\])\../,
      persistent: true,
      ignoreInitial: true,
    });

    watcher.on('change', (path) => {
      const relativePath = relative(cwd, path);
      console.log(pc.yellow(`📝 文件变更: ${relativePath}`));
      // esbuild serve 会自动处理重新构建
    });

    watcher.on('add', (path) => {
      const relativePath = relative(cwd, path);
      console.log(pc.green(`➕ 新增文件: ${relativePath}`));
    });

    watcher.on('unlink', (path) => {
      const relativePath = relative(cwd, path);
      console.log(pc.red(`🗑️ 删除文件: ${relativePath}`));
    });

    // 优雅关闭
    process.on('SIGINT', async () => {
      console.log(pc.cyan('\n🛑 正在关闭开发服务器...'));
