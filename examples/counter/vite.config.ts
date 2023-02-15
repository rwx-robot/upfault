import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  root: '.',
  resolve: {
    alias: {
      '@upfault/runtime': path.resolve(__dirname, '../../packages/runtime/dist'),
      '@upfault/ssr': path.resolve(__dirname, '../../packages/ssr/dist'),
      '@upfault/shared': path.resolve(__dirname, '../../packages/shared/dist'),