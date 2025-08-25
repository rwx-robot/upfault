/**
 * @upfault/cli - dev 命令测试（mock 所有外部依赖）
 *
 * dev 命令涉及 esbuild context.watch + chokidar + setTimeout + 动态 import。
 * 测试只验证配置传递、错误退出路径、SIGINT 监听，不实际启动服务。
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const TEST_ROOT = '/tmp/upfault-dev-test';

// mock 所有外部依赖
const mocks = vi.hoisted(() => ({
  esbuildContext: vi.fn(async () => ({
    watch: vi.fn(async () => {}),
    dispose: vi.fn(async () => {}),
  })),
  watcher: {
    on: vi.fn(),
    close: vi.fn(async () => {}),
  },
  chokidarWatch: vi.fn(() => mocks.watcher),
  startStaticServer: vi.fn(async () => ({
    url: 'http://localhost:3000',
    close: vi.fn(async () => {}),
    notifyHmr: vi.fn(),
  })),
  loadConfig: vi.fn(async () => ({
    entryPoints: ['src/main.ts'],
    publicDir: 'public',
    generateHtml: true,
    version: '0.2.0',
  })),
  findEntryPoints: vi.fn(() => ['src/main.ts']),
  copyPublicAssets: vi.fn(),
  generateIndexHtml: vi.fn(),
  exit: vi.fn(),
}));

vi.mock('esbuild', () => ({
  context: mocks.esbuildContext,
}));

vi.mock('chokidar', () => ({
  default: { watch: mocks.chokidarWatch },
  watch: mocks.chokidarWatch,
}));

vi.mock('../static-server', () => ({
  startStaticServer: mocks.startStaticServer,
}));

vi.mock('../commands/build', () => ({
  loadConfig: mocks.loadConfig,
  findEntryPoints: mocks.findEntryPoints,
  copyPublicAssets: mocks.copyPublicAssets,
  generateIndexHtml: mocks.generateIndexHtml,
}));

// mock process.exit
const _origExit = process.exit.bind(process);
Object.defineProperty(process, 'exit', { value: mocks.exit, writable: true, configurable: true });

beforeEach(() => {
  Object.values(mocks).forEach(m => {
    if (typeof m === 'function' && 'mockClear' in m) (m as any).mockClear();
  });
  // 临时伪造 cwd（避免依赖真实文件系统）
  Object.defineProperty(process, 'cwd', { value: () => TEST_ROOT, writable: true, configurable: true });
});

import { dev } from '../commands/dev';

describe('dev 命令', () => {

  it('无入口时应 process.exit(1)', async () => {
    mocks.findEntryPoints.mockReturnValueOnce([]);
    await dev({});
    expect(mocks.exit).toHaveBeenCalledWith(1);
  });

  it('有入口时应创建 esbuild context', async () => {
    await dev({});
    expect(mocks.esbuildContext).toHaveBeenCalledTimes(1);
    const opts = mocks.esbuildContext.mock.calls[0]![0];
    expect(opts.entryPoints).toEqual(['src/main.ts']);
    expect(opts.bundle).toBe(true);
    expect(opts.format).toBe('esm');
  });

  it('应启动 watch', async () => {
    await dev({});
    const ctx = await mocks.esbuildContext.mock.results[0]!.value;
    expect(ctx.watch).toHaveBeenCalled();
  });

  it('应启动静态 HTTP server', async () => {
    await dev({ port: 4000, host: '127.0.0.1' });
    expect(mocks.startStaticServer).toHaveBeenCalledWith(expect.objectContaining({
      port: 4000,
      host: '127.0.0.1',
    }));
  });

  it('默认 port=3000, host=localhost', async () => {
    await dev({});
    expect(mocks.startStaticServer).toHaveBeenCalledWith(expect.objectContaining({
      port: 3000,
      host: 'localhost',
    }));
  });

  it('应注册 SIGINT 优雅关闭监听', async () => {
    const before = process.listenerCount('SIGINT');
    await dev({});
    const after = process.listenerCount('SIGINT');
    expect(after).toBe(before + 1);
  });

  it('应启动 chokidar 监听 src 变化', async () => {
    await dev({});
    expect(mocks.chokidarWatch).toHaveBeenCalled();
    const patterns = mocks.chokidarWatch.mock.calls[0]![0];
    expect(patterns.some((p: string) => p.includes('src'))).toBe(true);
  });

  it('应复制 publicDir 并生成 index.html', async () => {
    await dev({});
    expect(mocks.copyPublicAssets).toHaveBeenCalled();
    expect(mocks.generateIndexHtml).toHaveBeenCalled();
  });

  it('应调用 loadConfig 读取配置', async () => {
    await dev({ config: './my.json' });
    expect(mocks.loadConfig).toHaveBeenCalledWith('./my.json');
  });
});