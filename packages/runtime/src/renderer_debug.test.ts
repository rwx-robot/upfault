import { describe, it, expect, vi } from 'vitest';
import { createRenderer, defaultRendererOptions } from './renderer';
import { h, VNodeType } from './h';

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
    // 新模型契约：VNode.type 为 VNodeType 枚举，真实标签存入 tag
    // children 为字符串 → 归一化为 TEXT VNode（shapeFlag TEXT_NODE），文本会被挂载
    const vnode = h('div', { id: 'test' }, 'hello');
    expect(vnode.type).toBe(VNodeType.ELEMENT);
    expect(vnode.tag).toBe('div');
    renderer.render(vnode, container);
    expect(container.innerHTML).toBe('<div id="test">hello</div>');
  });
});
