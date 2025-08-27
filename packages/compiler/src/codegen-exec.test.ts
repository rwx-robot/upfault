/**
 * 编译产物**可执行性**测试
 *
 * 这是 M6 暴露的关键缺陷的回归防线：旧 codegen 生成的产物从未被真正执行过，
 * 只做过 `toContain` 字符串断言，于是「import 不存在的 createElementVNode」
 * 「v-for 丢宿主元素」「@click 变成字符串」全部潜伏。
 *
 * 本测试走完整链路：compile(模板) → 剥离 import → new Function 求值 →
 * 交给 @upfault/runtime 挂载到 jsdom → 断言**真实 DOM**。
 */

import { describe, it, expect } from 'vitest';
import { compile } from './codegen';
import {
  createRenderer,
  defaultRendererOptions,
  h,
  Fragment,
  Text,
  Comment,
  ref,
  computed,
} from '@upfault/runtime';

const RE = createRenderer(defaultRendererOptions);

/** 编译模板 → 可执行 render 函数 */
function makeRender(template: string, filename = 'Case.uf', deps: Record<string, unknown> = {}) {
  const result = compile(template, { filename });
  // 剥掉 import 区块：helper 由宿主注入，与 Vite 插件在浏览器里的做法一致
  const body = result.code
    .replace(/^import .*$/gm, '')
    .replace(/^export function render/m, 'function render');

  const names = ['h', 'Fragment', 'Text', 'Comment', ...Object.keys(deps)];
  const values = [h, Fragment, Text, Comment, ...Object.values(deps)];
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  const factory = new Function(...names, `${body}\n;return render;`);
  return {
    render: factory(...values) as (ctx: any, cache?: any) => any,
    code: result.code,
    warnings: result.warnings,
    errors: result.errors,
  };
}

function mountInto(component: unknown): HTMLElement {
  const container = document.createElement('div');
  document.body.appendChild(container);
  RE.render(h(component as any), container);
  return container;
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('编译产物可执行性（compile → runtime → 真实 DOM）', () => {
  describe('静态结构与插值', () => {
    it('元素属性 / 嵌套 / ref 自动解包', () => {
      const { render } = makeRender('<div class="box"><span class="n">{{ count }}</span></div>');
      const el = mountInto({ setup: () => ({ count: ref(3) }), render });

      const box = el.querySelector('.box');
      expect(box).not.toBeNull();
      expect(el.querySelector('.box > .n')?.textContent).toBe('3');
    });

    it('computed 与表达式参与渲染', () => {
      const { render } = makeRender('<div><b>{{ label }}</b><i>{{ n + 1 }}</i></div>');
      const el = mountInto({
        setup: () => ({ n: ref(1), label: computed(() => 'ok') }),
        render,
      });

      expect(el.querySelector('b')?.textContent).toBe('ok');
      expect(el.querySelector('i')?.textContent).toBe('2');
    });

    it('静态属性不被当成表达式，动态属性走 _ctx', () => {
      const { code } = makeRender('<div class="page" :title="tip"></div>');
      expect(code).toContain('"class": "page"');
      expect(code).toContain('"title": _ctx.tip');
    });
  });

  describe('v-for', () => {
    const TEMPLATE =
      '<ul class="list"><li v-for="(t, i) in items" :key="t.id" :class="t.done ? \'done\' : \'\'">{{ i }}:{{ t.text }}</li></ul>';

    it('宿主元素与 :key 都保留，逐项渲染', () => {
      const { render, code } = makeRender(TEMPLATE);
      expect(code).toContain('.map(');
      // v-for 别名是作用域内标识符，不应被改写成 _ctx.t
      expect(code).toContain('"key": t.id');
      expect(code).toContain('..._ctx.items.map((t, i) =>');

      const el = mountInto({
        setup: () => ({
          items: ref([
            { id: 7, text: 'a', done: false },
            { id: 8, text: 'b', done: true },
          ]),
        }),
        render,
      });

      const items = [...el.querySelectorAll('li')];
      expect(items.map((n) => n.textContent)).toEqual(['0:a', '1:b']);
      expect(items[1]!.className).toBe('done');
      expect(items[0]!.className).toBe('');
    });

    it('列表数据变化后 keyed diff 正确更新 DOM', async () => {
      const { render } = makeRender(TEMPLATE);
      const items = ref([
        { id: 1, text: 'a', done: false },
        { id: 2, text: 'b', done: false },
        { id: 3, text: 'c', done: false },
      ]);
      const el = mountInto({ setup: () => ({ items }), render });
      expect(el.querySelectorAll('li')).toHaveLength(3);

      // 删中间 + 改末尾，考验 keyed 复用
      items.value = [items.value[0]!, { id: 3, text: 'c2', done: true }];
      await tick();

      const texts = [...el.querySelectorAll('li')].map((n) => n.textContent);
      expect(texts).toEqual(['0:a', '1:c2']);
      expect([...el.querySelectorAll('li')][1]!.className).toBe('done');
    });

    it('v-for 的 source 支持成员路径', () => {
      const { render } = makeRender('<ul><li v-for="x in data.rows" :key="x">{{ x }}</li></ul>');
      const el = mountInto({ setup: () => ({ data: ref({ rows: [1, 2, 3] }) }), render });
      expect(el.querySelectorAll('li')).toHaveLength(3);
    });

    it('解构型 v-for 给出告警而不是生成非法代码', () => {
      const { code, warnings } = makeRender('<ul><li v-for="{ id } in rows" :key="id">{{ id }}</li></ul>');
      expect(warnings.some((w) => w.message.includes('v-for 表达式无法解析'))).toBe(true);
      // 关键：不得把 `{ id } in rows` 当成表达式拼进产物（那是非法 JS）
      expect(code).not.toContain('_ctx.{');
      expect(code).toContain('h("ul", null, [null])');
    });
  });

  describe('v-if 分支链', () => {
    const TEMPLATE =
      '<div><p v-if="n > 2">big</p><p v-else-if="n === 2">mid</p><p v-else>small</p></div>';

    it('三个分支互斥渲染（v-else-if / v-else 不再被无条件渲染）', async () => {
      const { render } = makeRender(TEMPLATE);
      const n = ref(5);
      const el = mountInto({ setup: () => ({ n }), render });

      const read = () => [...el.querySelectorAll('p')].map((p) => p.textContent);
      expect(read()).toEqual(['big']);

      n.value = 2;
      await tick();
      expect(read()).toEqual(['mid']);

      n.value = 1;
      await tick();
      expect(read()).toEqual(['small']);
    });

    it('无 else 时条件为假渲染空', async () => {
      const { render } = makeRender('<div><p v-if="on">yes</p></div>');
      const on = ref(false);
      const el = mountInto({ setup: () => ({ on }), render });
      expect(el.querySelectorAll('p')).toHaveLength(0);

      on.value = true;
      await tick();
      expect(el.querySelector('p')?.textContent).toBe('yes');
    });
  });

  describe('事件', () => {
    it('@click 绑定的是函数而非字符串', async () => {
      const { code, render } = makeRender('<button @click="inc">{{ n }}</button>');
      expect(code).toContain('"onClick": _ctx.inc');
      expect(code).not.toContain('"onClick": "inc"');

      const n = ref(0);
      const el = mountInto({
        setup: () => ({ n, inc: () => { n.value += 1; } }),
        render,
      });

      const btn = el.querySelector('button')!;
      btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await tick();
      expect(btn.textContent).toBe('1');
    });

    it('内联语句被包成箭头函数', async () => {
      const { code, render } = makeRender('<button @click="n++">+</button>');
      expect(code).toContain('($event) => { _ctx.n++; }');

      const n = ref(0);
      const el = mountInto({ setup: () => ({ n }), render });
      el.querySelector('button')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await tick();
      expect(n.value).toBe(1);
    });

    it('.prevent 修饰符在函数体内展开', () => {
      const { render } = makeRender('<a href="#" @click.prevent="noop">x</a>');
      let defaultPrevented = false;
      const el = mountInto({
        setup: () => ({ noop: () => {} }),
        render,
      });

      const link = el.querySelector('a')!;
      link.addEventListener('click', (e) => {
        defaultPrevented = e.defaultPrevented;
      });
      // 渲染出的 handler 必须先 preventDefault
      link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      expect(defaultPrevented).toBe(true);
    });

    it('不支持的事件修饰符给出告警', () => {
      const { warnings } = makeRender('<button @click.once="x">x</button>');
      expect(warnings.some((w) => w.message.includes('@click.once'))).toBe(true);
    });
  });

  describe('v-model', () => {
    it('元素 v-model 生成 value + onInput 并双向同步', async () => {
      const { code, render } = makeRender('<div><input v-model="text" /><span>{{ text }}</span></div>');
      expect(code).toContain('value: _ctx.text');
      expect(code).toContain('onInput: ($event)');

      const text = ref('init');
      const el = mountInto({ setup: () => ({ text }), render });

      const input = el.querySelector('input')!;
      expect(input.value).toBe('init');

      input.value = 'hello';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await tick();

      expect(text.value).toBe('hello');
      expect(el.querySelector('span')?.textContent).toBe('hello');
    });
  });

  describe('子组件', () => {
    it('组件引用来自 _ctx，props 正确传递并渲染', () => {
      const { code, render } = makeRender('<div class="wrap"><Child :msg="greeting" /></div>');
      expect(code).toContain('_ctx.Child');

      const Child = {
        render: (props: any) => h('em', { class: 'msg' }, [props.msg]),
      };
      const el = mountInto({
        setup: () => ({ greeting: ref('hey'), Child }),
        render,
      });

      expect(el.querySelector('.wrap > .msg')?.textContent).toBe('hey');
    });

    it('子组件事件回调可写回父状态', async () => {
      const { render } = makeRender('<div><Child :msg="label" @picked="onPick" /></div>');
      const picked = ref('none');
      const Child = {
        render: (props: any) =>
          h('button', { onClick: () => props.onPicked('hit') }, [props.msg]),
      };

      const el = mountInto({
        setup: () => ({ label: ref('go'), picked, onPick: (v: string) => { picked.value = v; }, Child }),
        render,
      });

      el.querySelector('button')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await tick();
      expect(picked.value).toBe('hit');
    });
  });

  describe('产物形态', () => {
    it('只导入 runtime 真实存在的 helper', () => {
      const { code } = makeRender('<div><span>{{ x }}</span></div>');
      expect(code).toContain("import { h } from '@upfault/runtime';");
      for (const ghost of ['createElementVNode', 'createTextVNode', 'createVNode', 'openBlock', 'withDirectives']) {
        expect(code).not.toContain(ghost);
      }
    });

    it('多根模板包 Fragment', () => {
      const { code } = makeRender('<p>a</p><p>b</p>');
      expect(code).toContain('import { Fragment, h }');
      expect(code).toContain('h(Fragment, null,');
    });

    it('slot 给出未支持告警', () => {
      const { warnings } = makeRender('<div><slot /></div>');
      expect(warnings.some((w) => w.code === 'CODEGEN_UNSUPPORTED')).toBe(true);
    });
  });
});
