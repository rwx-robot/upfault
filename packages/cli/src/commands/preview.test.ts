/**
 * @upfault/cli - preview 命令测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { resolve } from 'path';

const TEST_ROOT = '/tmp/upfault-preview-test';

// 用 vi.hoisted 让变量在 vi.mock 工厂中可用
const mocks = vi.hoisted(() => ({
  startStaticServer: vi.fn(async () => ({
    url: 'http://localhost:4173',
    close: vi.fn(async () => {}),
    notifyHmr: vi.fn(),
  })),
}));

vi.mock('../static-server', () => ({
  startStaticServer: mocks.startStaticServer,
}));

// mock process.exit（避免测试因缺 dist 真的退出）
const mockExit = vi.fn();
const _origExit = process.exit.bind(process);
Object.defineProperty(process, 'exit', { value: mockExit, writable: true, configurable: true });

beforeEach(() => {
  mocks.startStaticServer.mockClear();
  mockExit.mockClear();
  try { rmSync(TEST_ROOT, { recursive: true }); } catch { /* ignore */ }
  mkdirSync(TEST_ROOT, { recursive: true });
  // 临时伪造 cwd
  Object.defineProperty(process, 'cwd', { value: () => TEST_ROOT, writable: true, configurable: true });
});

import { preview } from '../commands/preview';

describe('preview 命令', () => {

  it('dist 不存在时应 process.exit(1)', async () => {
    // TEST_ROOT 下没有 dist
    await preview({});
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('dist 存在时应启动静态 server', async () => {
    mkdirSync(resolve(TEST_ROOT, 'dist'), { recursive: true });
    writeFileSync(resolve(TEST_ROOT, 'dist', 'index.html'), '<html>built</html>');
    await preview({ port: 8080, host: '127.0.0.1' });
    expect(mocks.startStaticServer).toHaveBeenCalledWith(expect.objectContaining({
      root: resolve(TEST_ROOT, 'dist'),
      port: 8080,
      host: '127.0.0.1',
    }));
  });

  it('默认 port 4173、host localhost', async () => {
    mkdirSync(resolve(TEST_ROOT, 'dist'), { recursive: true });
    await preview({});
    expect(mocks.startStaticServer).toHaveBeenCalledWith(expect.objectContaining({
      port: 4173,
      host: 'localhost',
    }));
  });

  it('应注册 SIGINT 优雅关闭', async () => {
    mkdirSync(resolve(TEST_ROOT, 'dist'), { recursive: true });
    const listenersBefore = process.listenerCount('SIGINT');
    await preview({});
    const listenersAfter = process.listenerCount('SIGINT');
    expect(listenersAfter).toBe(listenersBefore + 1);
  });

  it('defaultFile 应为 index.html', async () => {
    mkdirSync(resolve(TEST_ROOT, 'dist'), { recursive: true });
    await preview({});
    expect(mocks.startStaticServer).toHaveBeenCalledWith(expect.objectContaining({
      defaultFile: 'index.html',
    }));
  });
});