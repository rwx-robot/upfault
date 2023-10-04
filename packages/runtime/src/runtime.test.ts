import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { h, Fragment, Text, Comment } from '@upfault/runtime';
import { createRenderer, defaultRendererOptions } from '@upfault/runtime';
import { onMounted, onUnmounted, getCurrentInstance } from '@upfault/runtime';
import { VNodeType } from '@upfault/runtime';

describe('UpFault Runtime', () => {
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

  describe('h() - VNode Creation', () => {
    it('should create element VNode', () => {