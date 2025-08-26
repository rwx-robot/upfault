import { h } from '@upfault/runtime';

export type Stats = { total: number; active: number; done: number };

export const Header = {
  render: (props: { title: string; stats: Stats }) =>
    h('header', { class: 'header' }, [
      h('h1', { class: 'title' }, props.title),
      h('div', { class: 'stats' }, [
        h('span', { class: 'stat total' }, `Total: ${props.stats.total}`),
        h('span', { class: 'stat active' }, `Active: ${props.stats.active}`),
        h('span', { class: 'stat done' }, `Done: ${props.stats.done}`),
      ]),
    ]),
};
