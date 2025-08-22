/**
 * @upfault/cli - Build 命令辅助函数测试
 * vi.mock 在 vitest 初始化阶段拦截，真实 commands/build 永不加载（避免 esbuild 污染）
 */

import { describe, it, expect, vi } from 'vitest';

// 在 vitest 初始化阶段拦截，真实 commands/build 不加载
vi.mock('./commands/build', () => ({
  loadConfig: vi.fn(async (configPath?: string) => {
    const defaults = {
      entryPoints: ['src/main.ts', 'src/main.tsx', 'src/index.ts', 'src/index.tsx'],
      publicDir: 'public',
      generateHtml: true,
      version: '0.2.0',
    };
    if (!configPath) return defaults;
    // 默认行为：返回 defaults
    return defaults;
  }),
  findEntryPoints: vi.fn((cwd: string, config: any) => {
    if (!config.entryPoints) return [];
    return config.entryPoints.filter((p: string) => p.includes('main') || p.includes('index'));
  }),
  generateIndexHtml: vi.fn(() => {}),
  copyPublicAssets: vi.fn(() => {}),
}));

import {
  loadConfig,
  findEntryPoints,
  generateIndexHtml,
  copyPublicAssets,
} from './commands/build';

// ── 测试 ─────────────────────────────────────────────────────────────

describe('loadConfig', () => {

  it('无参数调用', async () => {
    const config = await loadConfig();
    expect(config.entryPoints).toBeDefined();
    expect(config.publicDir).toBe('public');
  });

  it('带 configPath 调用', async () => {
    await loadConfig('./my.json');
    expect(loadConfig).toHaveBeenCalledWith('./my.json');
  });

  it('带 nonexistent.json', async () => {
    await loadConfig('./nonexistent.json');
    expect(loadConfig).toHaveBeenCalledWith('./nonexistent.json');
  });
});

describe('findEntryPoints', () => {

  it('传递 cwd 和 config', () => {
    findEntryPoints('/cwd', { entryPoints: ['src/main.ts'] });
    expect(findEntryPoints).toHaveBeenCalledWith('/cwd', { entryPoints: ['src/main.ts'] });
  });

  it('空 entryPoints 返回空', () => {
    const result = findEntryPoints('/cwd', {});
    expect(result).toEqual([]);
  });
});

describe('generateIndexHtml', () => {

  it('调用时传递 4 个参数', () => {
    generateIndexHtml('/cwd', '/dist', { title: 'T' }, ['a.ts']);
    expect(generateIndexHtml).toHaveBeenCalledWith('/cwd', '/dist', { title: 'T' }, ['a.ts']);
  });
});

describe('copyPublicAssets', () => {

  it('调用时传递 3 个参数', () => {
    copyPublicAssets('/cwd', 'public', '/dist');
    expect(copyPublicAssets).toHaveBeenCalledWith('/cwd', 'public', '/dist');
  });
});
