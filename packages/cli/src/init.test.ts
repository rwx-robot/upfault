/**
 * @upfault/cli - Init 命令测试（mock 方式）
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── mock commands/init ─────────────────────────────────────────────────

// 记录 init 调用参数
const initCalls: Array<[string, any]> = [];
const mockFsCreated: string[] = [];

vi.mock('./commands/init', async () => {
  const actual = await vi.importActual('./commands/init');

  return {
    ...actual as any,
    init: vi.fn(async (projectName: string, options: any) => {
      initCalls.push([projectName, options]);
      // 调用真实实现（不走交互 prompt）
      return (actual as any).init(projectName, options);
    }),
  };
});

// mock prompts: 默认不覆盖
vi.mock('prompts', () => ({
  default: vi.fn(() => Promise.resolve({ overwrite: false })),
}));

// 拦截 fs 写入，记录创建的文件
const origWriteFileSync = globalThis.writeFileSync;
const origMkdirSync = globalThis.mkdirSync;

beforeEach(() => {
  initCalls.length = 0;
});

import { init } from './commands/init';

describe('init 命令', () => {

  it('应为 vanilla 模板生成 package.json', async () => {
    await init('my-app', { template: 'vanilla' });
    expect(initCalls).toContainEqual(['my-app', { template: 'vanilla' }]);
  });

  it('force 模式应传 force:true', async () => {
    await init('existing', { force: true });
    expect(initCalls).toContainEqual(['existing', { force: true }]);
  });

  it('无参数时 projectName 为空字符串', async () => {
    await init('', {});
    expect(initCalls).toContainEqual(['', {}]);
  });

  it('options 缺省时应传递 undefined（函数内部会默认空对象）', async () => {
    await init('proj');
    // init(projectName, options?) 的第二个参数缺省时为 undefined（函数内部 default = {}）
    expect(initCalls).toContainEqual(['proj', undefined]);
  });

  it('template=vanilla 时传正确参数', async () => {
    await init('proj', { template: 'vanilla' });
    expect(initCalls).toContainEqual(['proj', { template: 'vanilla' }]);
  });

  it('多次调用记录全部调用', async () => {
    await init('a', {});
    await init('b', { force: true });
    expect(initCalls).toHaveLength(2);
    expect(initCalls[0][0]).toBe('a');
    expect(initCalls[1][0]).toBe('b');
  });
});
