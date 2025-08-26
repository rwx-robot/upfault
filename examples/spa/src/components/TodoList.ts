import { h } from '@upfault/runtime';
import { TodoItem, type Todo } from './TodoItem';

export const TodoList = {
  render: (props: { items: Todo[]; onToggle: (id: number) => void; onRemove: (id: number) => void }) =>
    h(
      'ul',
      { class: 'list' },
      props.items.map((todo) => h(TodoItem, { key: todo.id, todo, onToggle: props.onToggle, onRemove: props.onRemove }))
    ),
};
