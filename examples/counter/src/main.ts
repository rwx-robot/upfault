import { createRenderer, defaultRendererOptions } from '@upfault/runtime';
import { Counter } from './Counter';

const renderer = createRenderer(defaultRendererOptions);
const container = document.getElementById('app')!;