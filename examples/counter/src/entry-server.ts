import { createRenderer, defaultRendererOptions } from '@upfault/runtime';
import { hydrate, type VNode } from '@upfault/ssr';
import { Counter } from './Counter';

export function renderToString(app: VNode): string {
  let html = '';