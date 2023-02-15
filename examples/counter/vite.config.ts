import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  root: '.',
  resolve: {
    alias: {
      '@upfault/runtime': path.resolve(__dirname, '../../packages/runtime/dist'),
      '@upfault/ssr': path.resolve(__dirname, '../../packages/ssr/dist'),
      '@upfault/shared': path.resolve(__dirname, '../../packages/shared/dist'),
      '@upfault/reactivity': path.resolve(__dirname, '../../packages/reactivity/dist'),
      '@upfault/scheduler': path.resolve(__dirname, '../../packages/scheduler/dist'),
      '@upfault/diff': path.resolve(__dirname, '../../packages/diff/dist'),
    },
  },
  build: {
    target: 'esnext',
    outDir: 'dist',
    rollupOptions: {
      input: 'index.html',