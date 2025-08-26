/**
 * @upfault/ssr - render 模块测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { h } from '@upfault/runtime';
import { renderToString, renderToNodeStream, renderToWebStream, pipeToNodeWritable, pipeToWebWritable } from './render';
import { Writable } from 'stream';

// 截断 SSR 输出的辅助工具（head 注入会增长输出，仅保留核心 body）
function bodyOnly(html: string): string {
  // 去掉 head/body 包裹，仅看 render 输出本体
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/);
  return bodyMatch ? bodyMatch[1] : html;
}

describe('renderToString', () => {

  it('应渲染简单 div', () => {
    const html = renderToString(h('div', null, 'hello'));
    expect(html).toContain('<div');
    expect(html).toContain('hello');
    expect(html).toContain('</div>');
  });

  it('应渲染嵌套元素', () => {
    const html = renderToString(
      h('div', { id: 'root' },
        h('p', null, 'first'),
        h('p', null, 'second')
      )
    );
    expect(html).toContain('id="root"');
    expect(html).toContain('first');
    expect(html).toContain('second');
  });

  it('应正确转义 HTML 特殊字符', () => {
    const html = renderToString(h('div', null, '<script>alert("xss")</script>'));
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('应渲染文本节点', () => {
    const html = renderToString(h('span', null, 'text content'));
    expect(html).toContain('text content');
  });

  it('应支持 class 属性', () => {
    const html = renderToString(h('div', { class: 'foo bar' }, 'x'));
    expect(html).toContain('class="foo bar"');
  });

  it('空 vnode 应返回空字符串', () => {
    expect(renderToString(null as any)).toBe('');
    expect(renderToString(undefined as any)).toBe('');
  });

  it('裸字符串 vnode 应转义后输出', () => {
    expect(renderToString('hello' as any)).toBe('hello');
    expect(renderToString('<a>' as any)).toBe('&lt;a&gt;');
  });

  it('数字 vnode 应转为字符串', () => {
    expect(renderToString(42 as any)).toBe('42');
  });

  it('context.meta 有值时应注入 <meta> 标签', () => {
    const html = renderToString(h('div', null, 'x'), {
      context: { meta: { description: 'a test page' } },
    });
    expect(html).toContain('<meta name="description"');
  });

  it('空 options 时应使用默认 context', () => {
    const html = renderToString(h('div', null, 'x'));
    expect(typeof html).toBe('string');
    expect(html.length).toBeGreaterThan(0);
  });

  it('应保留多个连续文本子节点', () => {
    const html = renderToString(h('p', null, 'a', 'b', 'c'));
    expect(html).toContain('a');
    expect(html).toContain('b');
    expect(html).toContain('c');
  });
});

describe('renderToNodeStream', () => {

  it('应返回 NodeJS.ReadableStream', () => {
    const stream = renderToNodeStream(h('div', null, 'stream'));
    expect(stream).toBeDefined();
    expect(typeof stream.read).toBe('function');
    expect(typeof stream.on).toBe('function');
  });
});

describe('renderToWebStream', () => {

  it('应返回 ReadableStream', async () => {
    const stream = renderToWebStream(h('div', null, 'web'));
    expect(stream).toBeInstanceOf(ReadableStream);
    const reader = stream.getReader();
    const chunks: string[] = [];
    let totalLength = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(new TextDecoder().decode(value));
      totalLength += value.byteLength;
    }
    expect(chunks.length).toBeGreaterThan(0);
    const full = chunks.join('');
    expect(full).toContain('web');
    expect(totalLength).toBeGreaterThan(0);
  });
});

describe('pipeToNodeWritable', () => {

  it('应写入数据并结束流', async () => {
    const chunks: string[] = [];
    const writable = new Writable({
      write(chunk, _enc, cb) {
        chunks.push(chunk.toString());
        cb();
      },
    });
    await pipeToNodeWritable(h('div', null, 'piped'), writable);
    const full = chunks.join('');
    expect(full).toContain('piped');
  });
});

describe('pipeToWebWritable', () => {

  it('应写入数据并关闭流', async () => {
    const sink: string[] = [];
    const writable = new WritableStream({
      write(chunk) {
        sink.push(new TextDecoder().decode(chunk));
      },
    });
    await pipeToWebWritable(h('div', null, 'web-piped'), writable);
    expect(sink.join('')).toContain('web-piped');
  });
});