import { createRenderer, defaultRendererOptions } from '@upfault/runtime';
import { hydrate, type VNode } from '@upfault/ssr';
import { Counter } from './Counter';

export function renderToString(app: VNode): string {
  let html = '';
  
  const renderer = createRenderer({
    ...defaultRendererOptions,
    createElement: (tag, isSVG) => ({ tag, isSVG, props: {}, children: [] }),
    createText: (text) => ({ type: 'text', text }),
    createComment: (text) => ({ type: 'comment', text }),
    setElementText: (el, text) => { el.children = text; },
    setText: (node, text) => { node.text = text; },
    insert: (child, parent, anchor) => {
      if (!parent.children) parent.children = [];
      if (anchor) {
        const idx = parent.children.indexOf(anchor);
        parent.children.splice(idx, 0, child);
      } else {
        parent.children.push(child);
      }
    },
    remove: (child) => { /* no-op */ },
    patchProp: (el, key, prev, next) => {
      if (!el.props) el.props = {};
      if (next == null || next === false) {
        delete el.props[key];
      } else {
        el.props[key] = next;
      }
    },
    parentNode: () => null,
    nextSibling: () => null,
