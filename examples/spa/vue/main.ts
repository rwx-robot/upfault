/**
 * 基线：Vue 3 —— 与 UpFault SPA 结构等价的 Task Board。
 *
 * 度量口径与其它实现一致：renderMs = 入口模块开始执行 → 首屏 DOM 提交完成。
 * Vue 的 app.mount() 首次渲染是同步的，故直接在其后取值。
 */

import { computed, createApp, h, ref } from 'vue';

const T0 = performance.now();

type Todo = { id: number; text: string; done: boolean };

const N = Math.max(0, Number(new URLSearchParams(location.search).get('n') ?? '200') || 200);

function seed(n: number): Todo[] {
  const out: Todo[] = [];
  for (let i = 0; i < n; i++) {
    out.push({
      id: i + 1,
      text: `Task #${i + 1} — review module ${i % 7} of the pipeline`,
      done: i % 3 === 0,
    });
  }
  return out;
}

const FILTERS = ['all', 'active', 'done'] as const;

const todos = ref<Todo[]>(seed(N));
const filter = ref<(typeof FILTERS)[number]>('all');
const newText = ref('');

const stats = computed(() => {
  const done = todos.value.filter((t) => t.done).length;
  return { total: todos.value.length, active: todos.value.length - done, done };
});

const visible = computed(() =>
  filter.value === 'active'
    ? todos.value.filter((t) => !t.done)
    : filter.value === 'done'
      ? todos.value.filter((t) => t.done)
      : todos.value
);

const App = {
  setup() {
    return () =>
      h('div', { class: 'app' }, [
        h('header', { class: 'header' }, [
          h('h1', { class: 'title' }, 'UpFault Task Board'),
          h('div', { class: 'stats' }, [
            h('span', { class: 'stat total' }, `Total: ${stats.value.total}`),
            h('span', { class: 'stat active' }, `Active: ${stats.value.active}`),
            h('span', { class: 'stat done' }, `Done: ${stats.value.done}`),
          ]),
        ]),
        h('div', { class: 'controls' }, [
          h('input', {
            class: 'new-input',
            placeholder: 'Add a task…',
            value: newText.value,
            onInput: (e: Event) => {
              newText.value = (e.target as HTMLInputElement).value;
            },
          }),
          h('button', { class: 'add-btn' }, 'Add'),
          ...FILTERS.map((f) =>
            h(
              'button',
              {
                key: f,
                class: 'filter-btn' + (filter.value === f ? ' is-active' : ''),
                'data-filter': f,
                onClick: () => {
                  filter.value = f;
                },
              },
              f
            )
          ),
        ]),
        h(
          'ul',
          { class: 'list' },
          visible.value.map((todo) =>
            h('li', { key: todo.id, class: 'item' + (todo.done ? ' is-done' : '') }, [
              h('input', { class: 'toggle', type: 'checkbox', checked: todo.done }),
              h('span', { class: 'text' }, todo.text),
              h('button', { class: 'remove' }, '×'),
            ])
          )
        ),
      ]);
  },
};

createApp(App).mount('#app');

const app = document.getElementById('app')!;
(window as any).__spa = { renderMs: performance.now() - T0, nodes: app.querySelectorAll('*').length };
