import { describe, it, expect, vi } from 'vitest';
import { createRenderer, defaultRendererOptions } from './renderer';

describe('Renderer debug', () => {
  let container: HTMLElement;
  let renderer: ReturnType<typeof createRenderer>;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    renderer = createRenderer(defaultRendererOptions);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it('should have VNodeType available in renderer', () => {
    // This tests if the renderer's VNodeType import works
    const vnode = { type: 'div', props: { id: 'test' }, children: 'hello', key: null, flags: 0, patchFlag: 0, dynamicProps: null, vnodeType: 2, shapeFlag: 0, ref: null, el: null, parent: null, component: null, block: null };
    renderer.render(vnode as any, container);
    expect(container.innerHTML).toBe('<div id="test">hello</div>');
  });
});