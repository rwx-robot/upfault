// @vitest-environment node
/**
 * TS 脚本块转译测试
 *
 * 刻意运行在 **node 环境**：内置转译走 esbuild（Vite 的 transformWithEsbuild），
 * 而 esbuild 在 jsdom 环境下会因跨 realm 的 `Uint8Array` 判定失败：
 *   Invariant violation: "new TextEncoder().encode("") instanceof Uint8Array" is incorrectly false
 * 因此 DOM 无关的转译逻辑单独成文件，用 node 环境跑。
 */

import { describe, it, expect } from 'vitest';
import upfault, { preTranspileScript } from './index';

interface Ctx {
  warnings: { message?: string }[];
  ctx: any;
}

function makeCtx(): Ctx {
  const warnings: { message?: string }[] = [];
  const ctx = {
    warn(w: any) {
      warnings.push(typeof w === 'string' ? { message: w } : w);
    },
    error(e: any) {
      throw Object.assign(new Error(typeof e === 'string' ? e : e.message), { pluginError: true });
    },
    addWatchFile() {},
    meta: { watchMode: false },
  };
  return { warnings, ctx };
}

const hooks = (options?: Parameters<typeof upfault>[0]) =>
  upfault(options) as unknown as {
    transform: (this: any, code: string, id: string) => Promise<{ code: string } | null>;
  };

const TS_SFC = `<template><p>{{ n }}</p></template>
<script lang="ts">
export default {
  setup(): any {
    const n = ref(1 as number);
    return { n };
  },
};
</script>`;

describe('vite-plugin: TS 脚本块转译', () => {
  it('类型标注被剥离（内置 esbuild 转译）', async () => {
    const { ctx } = makeCtx();
    const out = await hooks().transform.call(ctx, TS_SFC, '/app/src/Ts.uf');

    expect(out).not.toBeNull();
    expect(out!.code).not.toContain('as number');
    expect(out!.code).not.toContain('setup(): any');
    expect(out!.code).toContain('export default __upfault_sfc;');
  });

  it('transpileScript=false 时保留 TS 原样', async () => {
    const { ctx } = makeCtx();
    const out = await hooks({ transpileScript: false }).transform.call(ctx, TS_SFC, '/app/src/Ts2.uf');
    expect(out!.code).toContain('setup(): any');
  });

  it('lang="tsx" 也走内置转译', async () => {
    const tsx = `<template><p>x</p></template>
<script lang="tsx">
export default { setup(): any { const n: number = 1; return { n }; } };
</script>`;
    const { ctx } = makeCtx();
    const out = await hooks().transform.call(ctx, tsx, '/app/src/Tsx.uf');
    expect(out!.code).not.toContain(': number');
  });
});

describe('vite-plugin: preTranspileScript', () => {
  it('无 lang 的脚本块无需转译', async () => {
    const js = '<template><p>x</p></template><script>export default {};</script>';
    expect(await preTranspileScript('/app/A.uf', js)).toBeUndefined();
  });

  it('lang 非 ts 系不启用内置转译', async () => {
    const js = '<template><p>x</p></template><script lang="js">export default {};</script>';
    expect(await preTranspileScript('/app/A.uf', js)).toBeUndefined();
  });

  it('自定义 scriptTransform 优先于内置转译', async () => {
    const custom = () => 'export default {};';
    expect(await preTranspileScript('/app/A.uf', TS_SFC, { scriptTransform: custom })).toBe(custom);
  });
});
