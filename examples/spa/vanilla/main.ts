/**
 * 基线：用原生 DOM API 构建与 UpFault SPA 结构等价的界面。
 * 用于量化「框架首次挂载」相对「手写 DOM」的开销。
 */

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

const el = (tag: string, cls?: string, text?: string): HTMLElement => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
};

const t0 = performance.now();

const todos = seed(N);
const active = todos.filter((t) => !t.done).length;
const done = todos.length - active;

const container = document.getElementById('app')!;
const root = el('div', 'app');

// header
const header = el('header', 'header');
header.appendChild(el('h1', 'title', 'UpFault Task Board'));
const stats = el('div', 'stats');
stats.appendChild(el('span', 'stat total', `Total: ${todos.length}`));
stats.appendChild(el('span', 'stat active', `Active: ${active}`));
stats.appendChild(el('span', 'stat done', `Done: ${done}`));
header.appendChild(stats);
root.appendChild(header);

// controls
const controls = el('div', 'controls');
const input = el('input', 'new-input') as HTMLInputElement;
input.placeholder = 'Add a task…';
controls.appendChild(input);
controls.appendChild(el('button', 'add-btn', 'Add'));
for (const f of ['all', 'active', 'done']) {
  controls.appendChild(el('button', 'filter-btn' + (f === 'all' ? ' is-active' : ''), f));
}
root.appendChild(controls);

// list
const list = el('ul', 'list');
for (const todo of todos) {
  const li = el('li', 'item' + (todo.done ? ' is-done' : ''));
  const toggle = el('input', 'toggle') as HTMLInputElement;
  toggle.type = 'checkbox';
  if (todo.done) toggle.checked = true;
  li.appendChild(toggle);
  li.appendChild(el('span', 'text', todo.text));
  li.appendChild(el('button', 'remove', '×'));
  list.appendChild(li);
}
root.appendChild(list);
container.appendChild(root);

const t1 = performance.now();

(window as any).__vanilla = {
  renderMs: t1 - t0,
  nodes: container.querySelectorAll('*').length,
};
