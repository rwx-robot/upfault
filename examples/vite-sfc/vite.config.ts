import { defineConfig } from 'vite';
import path from 'path';
import upfault from '../../packages/vite-plugin/src/index';

// 指向各包的 dist（与 examples/counter 保持同一约定）
const pkg = (name: string) => path.resolve(__dirname, `../../packages/${name}/dist`);

export default defineConfig({
  plugins: [upfault()],
  resolve: {
    alias: {
      '@upfault/runtime': pkg('runtime'),
      '@upfault/shared': pkg('shared'),
      '@upfault/reactivity': pkg('reactivity'),
      '@upfault/scheduler': pkg('scheduler'),
      '@upfault/diff': pkg('diff'),
    },
  },
  build: {
    target: 'esnext',
    outDir: 'dist',
  },
  server: {
    port: 3100,
  },
});
