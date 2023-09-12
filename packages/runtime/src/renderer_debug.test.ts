import { describe, it, expect, vi } from 'vitest';
import { createRenderer, defaultRendererOptions } from './renderer';

describe('Renderer debug', () => {
  let container: HTMLElement;
  let renderer: ReturnType<typeof createRenderer>;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);