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