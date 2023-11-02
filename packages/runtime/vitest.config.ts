import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['src/runtime.test.ts'],
    globals: true,
    pool: 'threads',
    poolOptions: {
      threads: { singleThread: true },
    },
    transformMode: {
      web: ['**/*.{ts,tsx}'],
    },
    deps: {
      optimizer: {
        web: {
          include: ['@upfault/runtime'],
        },
      },
    },
  },
  resolve: {
    alias: {
      '@upfault/shared': path.resolve(__dirname, '../../shared/src'),
      '@upfault/shared/diff': path.resolve(__dirname, '../../shared/src/diff.ts'),
      '@upfault/reactivity': path.resolve(__dirname, '../../reactivity/src'),
      '@upfault/diff': path.resolve(__dirname, '../../diff/src'),
      '@upfault/scheduler': path.resolve(__dirname, '../../scheduler/src'),
      '@upfault/runtime': path.resolve(__dirname, './dist'),
    },
  },