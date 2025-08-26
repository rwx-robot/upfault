/**
 * @upfault/ssr - streaming 模块测试
 */

import { describe, it, expect } from 'vitest';
import { h } from '@upfault/runtime';
import {
  createStreamRenderer,
  renderToPipeableStream,
  renderToReadableStream,
} from './streaming';
import { Writable, PassThrough } from 'stream';

describe('createStreamRenderer', () => {

  it('应返回一个 StreamRenderer 对象', () => {
    const renderer = createStreamRenderer();
    expect(renderer).toBeDefined();
    expect(typeof renderer).toBe('object');
  });

  it('空 options 应使用默认配置', () => {
    const r = createStreamRenderer();
    expect(r).toBeDefined();
  });

  it('带 streaming options 应被接受', () => {
    const r = createStreamRenderer({
      onShellReady: () => {},
      onAllReady: () => {},
      onError: () => {},
      onComplete: () => {},
    });
    expect(r).toBeDefined();
  });
});

describe('renderToPipeableStream', () => {

  it('应返回 ReadableStream', () => {
    const stream = renderToPipeableStream(h('div', null, 'pipe'));
    expect(stream).toBeInstanceOf(ReadableStream);
  });

  it('应可读出 body 内容', async () => {
    const stream = renderToPipeableStream(h('div', null, 'pipe-content'));
    const reader = stream.getReader();
    let total = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += new TextDecoder().decode(value);
    }
    expect(total).toContain('pipe-content');
  });
});

describe('renderToReadableStream', () => {

  it('应返回 ReadableStream', () => {
    const stream = renderToReadableStream(h('div', null, 'readable'));
    expect(stream).toBeInstanceOf(ReadableStream);
  });

  it('应可读出 body 内容', async () => {
    const stream = renderToReadableStream(h('div', null, 'stream-content'));
    const reader = stream.getReader();
    let total = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += new TextDecoder().decode(value);
    }
    expect(total).toContain('stream-content');
  });

  it('多块读取应输出全部内容', async () => {
    const stream = renderToReadableStream(
      h('ul', null,
        h('li', null, 'a'),
        h('li', null, 'b'),
        h('li', null, 'c')
      )
    );
    const reader = stream.getReader();
    let total = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += new TextDecoder().decode(value);
    }
    expect(total).toContain('<li');
    expect(total).toContain('a');
    expect(total).toContain('b');
    expect(total).toContain('c');
  });
});