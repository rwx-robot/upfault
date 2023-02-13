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