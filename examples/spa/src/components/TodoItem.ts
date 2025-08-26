import { h } from '@upfault/runtime';

export type Todo = { id: number; text: string; done: boolean };

export const TodoItem = {
  render: (props: { todo: Todo; onToggle: (id: number) => void; onRemove: (id: number) => void }) => {
    const { todo } = props;
    return h('li', { class: 'item' + (todo.done ? ' is-done' : ''), key: todo.id }, [
      h('input', {
        class: 'toggle',
        type: 'checkbox',
        ...(todo.done ? { checked: true } : {}),
        onChange: () => props.onToggle(todo.id),
      }),
      h('span', { class: 'text' }, todo.text),
      h('button', { class: 'remove', onClick: () => props.onRemove(todo.id) }, '×'),
    ]);
  },
};
