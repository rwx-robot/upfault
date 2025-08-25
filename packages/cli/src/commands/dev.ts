/**
 * Dev 命令 - 启动开发服务器（esbuild context.watch + 自建 HTTP server）
 *
 * 架构：
 *   chokidar watch ──► esbuild context.rebuild() ──► 通知 SSE 客户端
 *   chokidar watch ──► static-server.notifyHmr()   ──► 浏览器自动刷新
 *
 * esbuild 0.20+ 已移除 serve() 函数，dev server 由 cli 自己实现。
 */

import { context as esbuildContext, type BuildContext } from 'esbuild';
import chokidar from 'chokidar';
import { resolve, relative } from 'path';
import { existsSync, mkdirSync } from 'fs';
import pc from 'picocolors';
import { loadConfig, findEntryPoints, copyPublicAssets, generateIndexHtml } from './build';
import { startStaticServer, type StaticServer } from '../static-server';

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

  const outDir = resolve(cwd, '.upfault-dev');
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

  if (config.publicDir) copyPublicAssets(cwd, config.publicDir, outDir);
  generateIndexHtml(cwd, outDir, config, entryPoints);

  // 1. 创建 esbuild context + 启动 watch
  const buildCtx: BuildContext = await esbuildContext({
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
    plugins: [{
      name: 'upfault-log',
      setup(build) {
        build.onStart(() => console.log(pc.blue('🔄 重新构建...')));
        build.onEnd((result) => {
          if (result.errors.length > 0) {
            console.error(pc.red('❌ 构建错误:'));
            for (const e of result.errors) console.error(pc.red(`  ${e.text}`));
          } else {
            console.log(pc.green('✅ 热更新完成'));
            notifyHmr();
          }
        });
      },
    }],
  });

  await buildCtx.watch();

  // 2. 启动 HTTP 服务器
  const server: StaticServer = await startStaticServer({
    root: outDir,
    port,
    host,
    defaultFile: 'index.html',
    log: true,
  });
  let notifyHmr = () => server.notifyHmr();

  console.log(pc.green(`✅ 开发服务器已启动: ${server.url}`));
  console.log(pc.gray('按 Ctrl+C 停止服务器'));

  // 3. 文件监听（HMR 触发）
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
    notifyHmr();
  });

  watcher.on('add', (path) => {
    console.log(pc.green(`➕ 新增文件: ${relative(cwd, path)}`));
  });

  watcher.on('unlink', (path) => {
    console.log(pc.red(`🗑️ 删除文件: ${relative(cwd, path)}`));
  });

  // 优雅关闭
  process.on('SIGINT', async () => {
    console.log(pc.cyan('\n🛑 正在关闭开发服务器...'));
    await watcher.close();
    await buildCtx.dispose();
    await server.close();
    console.log(pc.gray('开发服务器已停止'));
    process.exit(0);
  });

  // 自动打开浏览器（用户可手动执行 `open http://localhost:${port}` 或浏览器自动捕获）
  // 注：open 包是可选依赖，避免在 dev 强依赖
  if (open) {
    console.log(pc.gray(`💡 请手动打开: ${server.url}`));
  }
}