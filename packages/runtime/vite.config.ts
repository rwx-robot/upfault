import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'UpFaultRuntime',
      fileName: 'index',
      formats: ['es'],
    },
    rollupOptions: {
      external: ['@upfault/*'],
      output: {
        globals: {},
      },
    },
  },
  resolve: {
    alias: {
      '@upfault/shared': path.resolve(__dirname, '../../packages/shared/src'),