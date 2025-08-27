/**
 * `.uf` 单文件组件（SFC）测试
 *
 * 与 codegen-exec 一致的验证口径：编译产物必须能被真正求值并挂载出真实 DOM，
 * 只断言字符串是不够的（M6 的教训）。
 */

import { describe, it, expect } from 'vitest';
import { parseSFC, compileSFC } from './sfc';
import { createRenderer, defaultRendererOptions, h, ref } from '@upfault/runtime';

const RE = createRenderer(defaultRendererOptions);

/** 求值 SFC 模块代码，返回其默认导出（组件对象） */
function evalModule(code: string, deps: Record<string, unknown> = {}): any {
  const body = code
    .replace(/^import .*$/gm, '')
    .replace(/^export function render/m, 'function render')
    .replace(/^export default /gm, 'return ');
  const names = ['h', 'ref', ...Object.keys(deps)];
  const values = [h, ref, ...Object.values(deps)];
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  return new Function(...names, body)(...values);
}

function mount(component: unknown): HTMLElement {
  const container = document.createElement('div');
  document.body.appendChild(container);
  RE.render(h(component as any), container);
  return container;
}

const SFC = `<template>
  <div class="counter">
    <button class="dec" @click="dec">-</button>
    <span class="count">{{ count }}</span>
    <button class="inc" @click="inc">+</button>
    <input v-model="text" />
    <ul><li v-for="t in items" :key="t.id" :class="t.done ? 'done' : ''">{{ t.text }}</li></ul>
  </div>
</template>

<script>
export default {
  name: 'Counter',
  setup() {
    const count = ref(1);
    const text = ref('hi');
    const items = ref([{ id: 1, text: 'a', done: false }]);
    return {
      count,
      text,
      items,
      inc: () => { count.value += 1; },
      dec: () => { count.value -= 1; },
    };
  },
};
</script>

<style>
.counter { font-family: system-ui; }
</style>`;

describe('parseSFC', () => {
  it('拆出 template / script / styles 三类块', () => {
    const r = parseSFC(SFC, { filename: 'Counter.uf' });

    expect(r.template?.content).toContain('<div class="counter">');
    expect(r.script?.content).toContain('export default');
    expect(r.styles).toHaveLength(1);
    expect(r.styles[0]!.content.trim()).toBe('.counter { font-family: system-ui; }');
    expect(r.styles[0]!.scoped).toBe(false);
    expect(r.errors).toHaveLength(0);
  });

  it('记录块内容的位置信息（供工具链定位）', () => {
    const r = parseSFC(SFC, { filename: 'Counter.uf' });

    // loc.source 是块内容本身，且 offset 能正确换算成行列
    expect(r.template!.loc.source.startsWith('\n  <div class="counter">')).toBe(true);
    expect(r.template!.loc.start.line).toBe(1); // 内容紧跟在 <template> 之后
    expect(r.script!.loc.start.line).toBeGreaterThan(r.template!.loc.end.line);
    expect(r.styles[0]!.loc.start.line).toBeGreaterThan(r.script!.loc.end.line);
  });

  it('style 可重复并带 lang / scoped 属性', () => {
    const r = parseSFC(
      '<template><p>x</p></template><style>.a{}</style><style scoped lang="scss">.b{}</style>'
    );
    expect(r.styles).toHaveLength(2);
    expect(r.styles[0]!.scoped).toBe(false);
    expect(r.styles[1]!.scoped).toBe(true);
    expect(r.styles[1]!.lang).toBe('scss');
    // scoped 尚未支持 → 必须告警，不能静默当成全局样式
    expect(compileSFC('<template><p>x</p></template><style scoped>.a{}</style>', {
      filename: 'A.uf',
    }).warnings.some((w) => w.code === 'SFC_SCOPED_STYLE_UNSUPPORTED')).toBe(true);
  });

  it('重复 template / script 报错', () => {
    const r = parseSFC('<template><p>a</p></template><template><p>b</p></template>');
    expect(r.errors.some((e) => e.code === 'SFC_DUPLICATE_TEMPLATE')).toBe(true);

    const r2 = parseSFC('<script>export default {}</script><script>export default {}</script>');
    expect(r2.errors.some((e) => e.code === 'SFC_DUPLICATE_SCRIPT')).toBe(true);
  });

  it('<script setup> 明确告警而非静默忽略', () => {
    const r = parseSFC('<template><p>x</p></template><script setup>const a = 1;</script>');
    expect(r.script).toBeNull();
    expect(r.warnings.some((w) => w.code === 'SFC_SCRIPT_SETUP_UNSUPPORTED')).toBe(true);
  });

  it('空文件报错', () => {
    const r = parseSFC('');
    expect(r.errors.some((e) => e.code === 'SFC_EMPTY')).toBe(true);
  });
});

describe('compileSFC', () => {
  it('产物可求值：默认导出即组件对象，真实 DOM 完整渲染', () => {
    const result = compileSFC(SFC, { filename: 'Counter.uf' });
    expect(result.errors).toHaveLength(0);
    expect(result.code).toContain('export default __upfault_sfc;');
    expect(result.code).toContain('__upfault_sfc.render = render;');

    const Component = evalModule(result.code, { ref });
    const el = mount(Component);

    expect(el.querySelector('.count')?.textContent).toBe('1');
    expect(el.querySelectorAll('li')).toHaveLength(1);
    expect(el.querySelector('li')?.textContent).toBe('a');
  });

  it('模板事件与响应式更新在 SFC 里照常工作', async () => {
    const result = compileSFC(SFC, { filename: 'Counter.uf' });
    const Component = evalModule(result.code, { ref });
    const el = mount(Component);

    el.querySelector('.inc')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 0));
    expect(el.querySelector('.count')?.textContent).toBe('2');

    el.querySelector('.dec')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 0));
    expect(el.querySelector('.count')?.textContent).toBe('1');
  });

  it('script 无 export default 时仍产出可渲染组件', () => {
    const result = compileSFC('<template><p>{{ msg }}</p></template>', { filename: 'Plain.uf' });
    expect(result.errors).toHaveLength(0);

    const Component = evalModule(result.code);
    const el = mount({ ...Component, setup: () => ({ msg: 'plain' }) });
    expect(el.querySelector('p')?.textContent).toBe('plain');
  });

  it('无模板但脚本自带 render 时保留脚本 render', () => {
    const result = compileSFC(
      `<script>export default { render: () => h('b', null, ['scripted']) };</script>`,
      { filename: 'ScriptOnly.uf' }
    );
    expect(result.errors).toHaveLength(0);
    expect(result.code).not.toContain('__upfault_sfc.render = render;');

    const Component = evalModule(result.code);
    const el = mount(Component);
    expect(el.querySelector('b')?.textContent).toBe('scripted');
  });

  it('无模板且无 render 时报错', () => {
    const result = compileSFC('<script>export const x = 1;</script>', { filename: 'Bad.uf' });
    expect(result.errors.some((e) => e.code === 'SFC_NO_RENDER')).toBe(true);
  });

  it('scriptTransform 可注入 TS 转译', () => {
    const calls: string[] = [];
    const result = compileSFC(
      `<template><p>{{ n }}</p></template><script lang="ts">export default { setup(): { n: number } { return { n: 5 }; } };</script>`,
      {
        filename: 'Ts.uf',
        scriptTransform: ({ code, lang }) => {
          calls.push(String(lang));
          // 伪转译：仅用于验证钩子被调用与 lang 被透传
          return code.replace(/: \{[^}]*\}/, '');
        },
      }
    );
    expect(calls).toEqual(['ts']);
    expect(result.errors).toHaveLength(0);
    expect(result.code).not.toContain('setup(): { n: number }');
  });

  it('scriptTransform 抛错被收集为编译错误', () => {
    const result = compileSFC('<template><p>x</p></template><script lang="ts">export default {};</script>', {
      filename: 'BadTs.uf',
      scriptTransform: () => {
        throw new Error('boom');
      },
    });
    expect(result.errors.some((e) => e.code === 'SFC_SCRIPT_TRANSFORM_FAILED')).toBe(true);
  });

  it('模板内的编译告警会向上传递', () => {
    const result = compileSFC('<template><div><slot /></div></template>', { filename: 'Slot.uf' });
    expect(result.warnings.some((w) => w.code === 'CODEGEN_UNSUPPORTED')).toBe(true);
  });
});
