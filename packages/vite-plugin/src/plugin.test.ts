/**
 * @upfault/vite-plugin 测试
 *
 * 直接调用插件钩子（不启动 dev server），并**执行** transform 产物，
 * 用 @upfault/runtime 挂到 jsdom 上断言真实 DOM —— 与 codegen-exec 同一口径。
 */

import { describe, it, expect } from 'vitest';
import { createRenderer, defaultRendererOptions, h, ref } from '@upfault/runtime';
import upfault from './index';

const RE = createRenderer(defaultRendererOptions);

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

type Hooks = {
  transform: (this: any, code: string, id: string) => Promise<{ code: string; map: null } | null>;
  resolveId: (this: any, id: string) => string | null;
  load: (this: any, id: string) => string | null;
  handleHotUpdate: (this: any, ctx: any) => unknown[] | undefined;
  name: string;
  enforce?: string;
};

const hooks = (options?: Parameters<typeof upfault>[0]): Hooks => upfault(options) as unknown as Hooks;

const SFC = `<template>
  <div class="card">
    <h2>{{ title }}</h2>
    <button class="add" @click="add">{{ count }}</button>
  </div>
</template>

<script>
export default {
  name: 'Card',
  setup() {
    const title = ref('Card');
    const count = ref(0);
    return { title, count, add: () => { count.value += 1; } };
  },
};
</script>
`;

/** 执行 transform 产物（剔除样式 import 与 import 语句） */
function evalModule(code: string): any {
  const body = code
    .replace(/^import .*$/gm, '')
    .replace(/^export function render/m, 'function render')
    .replace(/^export default /gm, 'return ');
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  return new Function('h', 'ref', 'Fragment', 'Text', 'Comment', body)(h, ref, undefined, undefined, undefined);
}

describe('vite-plugin: 基本契约', () => {
  it('插件元信息：pre 阶段接管 .uf', () => {
    const p = hooks();
    expect(p.name).toBe('upfault');
    expect(p.enforce).toBe('pre');
  });

  it('非 .uf 文件直接放行', async () => {
    const { ctx } = makeCtx();
    const out = await hooks().transform.call(ctx, 'export const a = 1;', '/app/src/util.ts');
    expect(out).toBeNull();
  });

  it('自定义 include 正则生效', async () => {
    const { ctx } = makeCtx();
    const p = hooks({ include: /\.ufc$/ });
    expect(await p.transform.call(ctx, '<template><p>x</p></template>', '/app/A.uf')).toBeNull();
    const out = await p.transform.call(ctx, '<template><p>x</p></template>', '/app/A.ufc');
    expect(out?.code).toContain('export default');
  });
});

describe('vite-plugin: transform 产物', () => {
  it('产出可执行 ESM 模块并能渲染出真实 DOM', async () => {
    const { ctx, warnings } = makeCtx();
    const out = await hooks().transform.call(ctx, SFC, '/app/src/Card.uf');

    expect(out).not.toBeNull();
    expect(warnings).toHaveLength(0);
    expect(out!.code).toContain("import { h } from '@upfault/runtime';");
    expect(out!.code).toContain('export default __upfault_sfc;');

    const Component = evalModule(out!.code);
    const container = document.createElement('div');
    document.body.appendChild(container);
    RE.render(h(Component), container);

    expect(container.querySelector('h2')?.textContent).toBe('Card');
    expect(container.querySelector('.add')?.textContent).toBe('0');
  });

  it('事件与响应式更新在插件产物中工作', async () => {
    const { ctx } = makeCtx();
    const out = await hooks().transform.call(ctx, SFC, '/app/src/Card.uf');
    const Component = evalModule(out!.code);

    const container = document.createElement('div');
    document.body.appendChild(container);
    RE.render(h(Component), container);

    container.querySelector('.add')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 0));
    expect(container.querySelector('.add')?.textContent).toBe('1');
  });

  it('样式块以副作用 import 注入，路径带 upfault-style 查询', async () => {
    const { ctx } = makeCtx();
    const withStyle = SFC.replace('</template>', '</template>\n<style>.card { color: red; }</style>');
    const out = await hooks().transform.call(ctx, withStyle, '/app/src/Card.uf');

    expect(out!.code).toContain('import "/app/src/Card.uf?upfault-style=0";');
    // 样式 import 必须在最前面，保证 CSS 先于组件渲染被注册
    expect(out!.code.startsWith('import "/app/src/Card.uf?upfault-style=0";')).toBe(true);
  });

  it('编译错误通过 this.error 抛出并带文件位置', async () => {
    const { ctx } = makeCtx();
    const broken = '<template><p>a</p></template><template><p>b</p></template>';
    await expect(hooks().transform.call(ctx, broken, '/app/src/Broken.uf')).rejects.toThrow(
      /重复的 <template>/
    );
  });

  it('未支持特性以 this.warn 上报（不静默）', async () => {
    const { ctx, warnings } = makeCtx();
    const withSlot = '<template><div><slot /></div></template>';
    await hooks().transform.call(ctx, withSlot, '/app/src/Slot.uf');

    expect(warnings.some((w) => /插槽尚未支持/.test(w.message ?? ''))).toBe(true);
    expect(warnings.every((w) => typeof w.message === 'string' && w.message.includes('/app/src/Slot.uf'))).toBe(
      true
    );
  });

  it('scriptTransform 自定义钩子优先', async () => {
    const { ctx } = makeCtx();
    const out = await hooks({
      scriptTransform: () => 'export default { setup: () => ({ n: 42 }) };',
    }).transform.call(ctx, SFC, '/app/src/Custom.uf');

    expect(out!.code).toContain('setup: () => ({ n: 42 })');
    expect(out!.code).not.toContain('name: \'Card\'');
  });
});

describe('vite-plugin: 样式虚拟模块', () => {
  const styleId = '/app/src/Card.uf?upfault-style=0';

  it('resolveId 追加 &lang.css 交给 Vite 的 CSS 管道', () => {
    expect(hooks().resolveId.call(makeCtx().ctx, styleId)).toBe(`${styleId}&lang.css`);
    expect(hooks().resolveId.call(makeCtx().ctx, '/app/src/main.ts')).toBeNull();
  });

  it('load 返回对应 <style> 块内容', () => {
    // 写一个真实文件，覆盖 load 的读盘路径
    const dir = '/tmp/upfault-plugin-test';
    const file = `${dir}/Styled.uf`;
    // 用 vitest 环境下的 node API（jsdom 环境仍可访问 node:fs）
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fs = require('node:fs') as typeof import('node:fs');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(file, '<template><p>x</p></template><style>.a{color:red}</style><style>.b{color:blue}</style>');

    const p = hooks();
    expect(p.load.call(makeCtx().ctx, `${file}?upfault-style=1&lang.css`)).toBe('.b{color:blue}');
    expect(p.load.call(makeCtx().ctx, `${file}?upfault-style=0&lang.css`)).toBe('.a{color:red}');
    expect(p.load.call(makeCtx().ctx, '/app/src/main.ts')).toBeNull();
  });

  it('handleHotUpdate：.uf 变更触发整页刷新', () => {
    const sent: unknown[] = [];
    const server = { ws: { send: (m: unknown) => sent.push(m) } };

    expect(hooks().handleHotUpdate.call(makeCtx().ctx, { file: '/app/src/Card.uf', server })).toEqual([]);
    expect(sent).toEqual([{ type: 'full-reload' }]);

    expect(hooks().handleHotUpdate.call(makeCtx().ctx, { file: '/app/src/main.ts', server })).toBeUndefined();
    expect(sent).toHaveLength(1);
  });
});
