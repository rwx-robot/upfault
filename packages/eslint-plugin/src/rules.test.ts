import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Linter } from 'eslint';
import plugin from './index';

const linter = new Linter();

const ALL_RULES: Record<string, string> = {
  'upfault/valid-v-for-key': 'error',
  'upfault/no-v-if-with-v-for': 'error',
  'upfault/no-side-effect-in-template': 'error',
  'upfault/no-missing-setup-binding': 'error',
};

/** 用真实 ESLint 引擎跑一次 lint（不是自造 harness） */
function lint(code: string, rules: Record<string, string> = ALL_RULES, filename = 'src/App.uf') {
  return linter.verify(
    code,
    [
      {
        files: ['**/*.uf'],
        plugins: { upfault: plugin as never },
        languageOptions: { parser: plugin.parser as never },
        rules,
      },
    ],
    { filename }
  );
}

function ruleIds(messages: ReturnType<typeof lint>): string[] {
  return messages.map((m) => m.ruleId ?? `fatal:${m.message}`);
}

describe('@upfault/eslint-plugin 规则', () => {
  describe('valid-v-for-key', () => {
    it('v-for 缺 :key 时报错，位置落在宿主元素上', () => {
      const code = ['<template>', '  <ul>', '    <li v-for="t in items">{{ t }}</li>', '  </ul>', '</template>', ''].join('\n');
      const messages = lint(code);
      expect(ruleIds(messages)).toEqual(['upfault/valid-v-for-key']);
      expect(messages[0]!.line).toBe(3);
      expect(messages[0]!.column).toBe(5); // `<` 前有 4 个空格 → 1-based 第 5 列
    });

    it('提供 :key 时通过', () => {
      const code = ['<template>', '  <ul>', '    <li v-for="t in items" :key="t.id">{{ t }}</li>', '  </ul>', '</template>', ''].join('\n');
      expect(lint(code)).toHaveLength(0);
    });
  });

  describe('no-v-if-with-v-for', () => {
    it('同元素共存时提示，位置落在 v-if 上', () => {
      const code = ['<template>', '  <ul>', '    <li v-if="show" v-for="t in items" :key="t.id">{{ t }}</li>', '  </ul>', '</template>', ''].join('\n');
      const messages = lint(code);
      expect(ruleIds(messages)).toEqual(['upfault/no-v-if-with-v-for']);
      expect(messages[0]!.line).toBe(3);
      expect(messages[0]!.column).toBe(9); // `v-if` 从第 9 列（1-based）开始
    });

    it('条件在外层容器上时不报', () => {
      const code = [
        '<template>',
        '  <div v-if="show">',
        '    <ul>',
        '      <li v-for="t in items" :key="t.id">{{ t }}</li>',
        '    </ul>',
        '  </div>',
        '</template>',
        '',
      ].join('\n');
      expect(lint(code)).toHaveLength(0);
    });
  });

  describe('no-side-effect-in-template', () => {
    it('插值里的自增被拦下，并指出具体构造', () => {
      const code = ['<template>', '  <p>{{ count++ }}</p>', '</template>', '', '<script>', 'export default { setup() { const count = ref(0); return { count }; } };', '</script>', ''].join('\n');
      const messages = lint(code);
      expect(ruleIds(messages)).toEqual(['upfault/no-side-effect-in-template']);
      expect(messages[0]!.line).toBe(2);
      expect(messages[0]!.message).toContain('自增自减');
    });

    it('事件处理器里的自增是合法的（发生时才执行）', () => {
      const code = ['<template>', '  <button @click="count++">{{ count }}</button>', '</template>', ''].join('\n');
      expect(lint(code)).toHaveLength(0);
    });

    it('动态属性里的赋值被拦下', () => {
      const code = ['<template>', '  <p :class="{ a: (b = 1) }">x</p>', '</template>', ''].join('\n');
      const messages = lint(code);
      expect(ruleIds(messages)).toEqual(['upfault/no-side-effect-in-template']);
      expect(messages[0]!.line).toBe(2);
    });
  });

  describe('no-missing-setup-binding', () => {
    const withComponent = (exposeTodoList: boolean) =>
      [
        '<template>',
        '  <div>',
        '    <TodoList :items="items" />',
        '  </div>',
        '</template>',
        '',
        '<script>',
        "import TodoList from './TodoList.uf';",
        'export default {',
        '  setup() {',
        '    const items = ref([]);',
        exposeTodoList ? '    return { items, TodoList };' : '    return { items };',
        '  },',
        '};',
        '</script>',
        '',
      ].join('\n');

    it('导入的子组件忘了 return：报在标签上', () => {
      const messages = lint(withComponent(false));
      expect(ruleIds(messages)).toEqual(['upfault/no-missing-setup-binding']);
      expect(messages[0]!.line).toBe(3);
      expect(messages[0]!.column).toBe(6); // `<TodoList` 的 T 在第 6 列（1-based）
      expect(messages[0]!.message).toContain('TodoList');
    });

    it('return 出去之后通过', () => {
      expect(lint(withComponent(true))).toHaveLength(0);
    });

    it('依赖 props 的模板不误报（props 没有静态声明，无从判定）', () => {
      const code = [
        '<template>',
        '  <li v-for="t in items" :key="t.id" @click="toggle(t.id)">{{ t.text }}</li>',
        '</template>',
        '',
        '<script>',
        "export default { name: 'TodoList' };",
        '</script>',
        '',
      ].join('\n');
      expect(lint(code)).toHaveLength(0);
    });

    it('setup 返回值判不了时整条规则收手（宁可不报）', () => {
      const code = [
        '<template>',
        '  <TodoList />',
        '</template>',
        '',
        '<script>',
        "import TodoList from './TodoList.uf';",
        'export default {',
        '  setup() {',
        '    const ctx = { TodoList };',
        '    return ctx;',
        '  },',
        '};',
        '</script>',
        '',
      ].join('\n');
      expect(lint(code)).toHaveLength(0);
    });

    it('computed 的成员访问只检查根名', () => {
      const code = [
        '<template>',
        '  <p>{{ stats.total }} / {{ missing.total }}</p>',
        '</template>',
        '',
        '<script>',
        'export default {',
        '  setup() {',
        '    const stats = computed(() => ({ total: 1 }));',
        '    const unusedMissing = computed(() => ({ total: 2 }));',
        '    return { stats };',
        '  },',
        '};',
        '</script>',
        '',
      ].join('\n');
      // `missing` 既未声明也未 return → 不在脚本顶层声明集合里，规则不发问（避免与拼写错误混淆）
      expect(lint(code)).toHaveLength(0);
    });
  });

  describe('脚本块仍然享受既有规则', () => {
    it('核心规则（no-debugger）在 .uf 的脚本块上正常工作', () => {
      const code = ['<template>', '  <p>x</p>', '</template>', '', '<script>', 'debugger;', 'export default {};', '</script>', ''].join('\n');
      const messages = lint(code, { 'no-debugger': 'error' });
      expect(ruleIds(messages)).toEqual(['no-debugger']);
      expect(messages[0]!.line).toBe(6);
    });
  });

  describe('真实示例零告警', () => {
    // vitest 的 cwd 是 monorepo 根（upfault/），直接用相对路径最稳
    const read = (name: string) =>
      readFileSync(join(process.cwd(), 'examples/vite-sfc/src', name), 'utf8');

    it('examples/vite-sfc 的 App.uf 无任何告警', () => {
      expect(lint(read('App.uf'), ALL_RULES, 'examples/vite-sfc/src/App.uf')).toHaveLength(0);
    });

    it('examples/vite-sfc 的 TodoList.uf 无任何告警', () => {
      expect(lint(read('TodoList.uf'), ALL_RULES, 'examples/vite-sfc/src/TodoList.uf')).toHaveLength(0);
    });
  });
});
