/**
 * UpFault Task Board —— M5 真实 SPA 首屏基准的被测应用
 *
 * 刻意覆盖常见 SPA 负载：
 *  - 组件的响应式状态（ref）
 *  - 派生数据（computed）
 *  - keyed 列表增删改（走 aeroDiff）
 *  - 嵌套组件 + props 传递
 *  - 事件处理（input / click）
 *
 * 初始条目数由 URL ?n= 控制，便于基准脚本扫描不同规模。
 */

import { h, ref, computed } from '@upfault/runtime';
import { Header } from './components/Header';
import { TodoList } from './components/TodoList';

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

// 说明：当前 runtime 尚未提供 setup()/组件内部状态 API，
// 因此状态置于模块作用域（单实例 SPA，可接受）。
const todos = ref<Todo[]>(seed(N));
const filter = ref<'all' | 'active' | 'done'>('all');
const newText = ref('');
let nextId = N + 1;

const stats = computed(() => ({
  total: todos.value.length,
  active: todos.value.filter((t) => !t.done).length,
  done: todos.value.filter((t) => t.done).length,
}));

const visible = computed(() => {
  if (filter.value === 'active') return todos.value.filter((t) => !t.done);
  if (filter.value === 'done') return todos.value.filter((t) => t.done);
  return todos.value;
});

export function addTodo(): void {
  const text = newText.value.trim() || `Task #${nextId}`;
  todos.value = [...todos.value, { id: nextId++, text, done: false }];
  newText.value = '';
}

function toggleTodo(id: number): void {
  todos.value = todos.value.map((t) => (t.id === id ? { ...t, done: !t.done } : t));
}

function removeTodo(id: number): void {
  todos.value = todos.value.filter((t) => t.id !== id);
}

const FILTERS: Array<'all' | 'active' | 'done'> = ['all', 'active', 'done'];

export const App = {
  render: () =>
    h('div', { class: 'app' }, [
      h(Header, { title: 'UpFault Task Board', stats: stats.value }),
      h('div', { class: 'controls' }, [
        h('input', {
          class: 'new-input',
          placeholder: 'Add a task…',
          value: newText.value,
          onInput: (e: Event) => {
            newText.value = (e.target as HTMLInputElement).value;
          },
        }),
        h('button', { class: 'add-btn', onClick: addTodo }, 'Add'),
        ...FILTERS.map((f) =>
          h(
            'button',
            {
              key: `filter-${f}`,
              class: 'filter-btn' + (filter.value === f ? ' is-active' : ''),
              // data-filter 供基准脚本稳定定位（避免 :nth-of-type 按标签名计数踩坑）
              'data-filter': f,
              onClick: () => {
                filter.value = f;
              },
            },
            f
          )
        ),
      ]),
      h(TodoList, { items: visible.value, onToggle: toggleTodo, onRemove: removeTodo }),
    ]),
};
