/**
 * 基线：React 18 —— 与 UpFault SPA 结构等价的 Task Board。
 *
 * 度量口径与其它实现一致：renderMs = 入口模块开始执行 → 首屏 DOM 提交完成。
 * React 18 的 createRoot().render() 是异步提交，故用 useLayoutEffect
 * （DOM 变更后、浏览器绘制前）记录首次提交时刻。
 *
 * 刻意与 examples/spa/src 保持同一 DOM 结构（同样的 class/data-filter），
 * 以便节点数可直接交叉核对。
 */

import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';

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

function App() {
  const [todos] = useState<Todo[]>(() => seed(N));
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('all');
  const [newText, setNewText] = useState('');

  const stats = useMemo(() => {
    const done = todos.filter((t) => t.done).length;
    return { total: todos.length, active: todos.length - done, done };
  }, [todos]);

  const visible = useMemo(
    () =>
      filter === 'active' ? todos.filter((t) => !t.done) : filter === 'done' ? todos.filter((t) => t.done) : todos,
    [todos, filter]
  );

  const reported = useRef(false);
  useLayoutEffect(() => {
    if (reported.current) return;
    reported.current = true;
    const app = document.getElementById('app')!;
    (window as any).__spa = { renderMs: performance.now() - T0, nodes: app.querySelectorAll('*').length };
  });

  return (
    <div className="app">
      <header className="header">
        <h1 className="title">UpFault Task Board</h1>
        <div className="stats">
          <span className="stat total">Total: {stats.total}</span>
          <span className="stat active">Active: {stats.active}</span>
          <span className="stat done">Done: {stats.done}</span>
        </div>
      </header>
      <div className="controls">
        <input
          className="new-input"
          placeholder="Add a task…"
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
        />
        <button className="add-btn">Add</button>
        {FILTERS.map((f) => (
          <button
            key={f}
            className={'filter-btn' + (filter === f ? ' is-active' : '')}
            data-filter={f}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>
      <ul className="list">
        {visible.map((todo) => (
          <li key={todo.id} className={'item' + (todo.done ? ' is-done' : '')}>
            <input className="toggle" type="checkbox" defaultChecked={todo.done} />
            <span className="text">{todo.text}</span>
            <button className="remove">×</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

createRoot(document.getElementById('app')!).render(<App />);
