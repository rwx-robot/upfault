import { defineConfig } from 'vitest/config';
import path from 'path';

// UpFault 单元测试配置（monorepo 内层）
// 注意：外层 upfault-all/vitest.config.ts 存在 alias 路径错误（compiler.src 等应为
// compiler/src）且外层无 node_modules 无法加载 vitest/config，测试以内层配置为准。
export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['packages/**/src/**/*.test.ts'],
    globals: true,
    pool: 'threads',
    poolOptions: {
      // jsdom 环境吃内存，默认 worker 上限会 OOM（评审发现：3 个测试文件崩溃）
      threads: { memoryLimit: 4096 },
    },
    // 全量并行时多个 jsdom worker 同时跑会 OOM，改为顺序执行
    fileParallelism: false,
  },
  resolve: {
    alias: {
      '@upfault/shared': path.resolve(__dirname, 'packages/shared/src'),
      '@upfault/reactivity': path.resolve(__dirname, 'packages/reactivity/src'),
      '@upfault/diff': path.resolve(__dirname, 'packages/diff/src'),
      '@upfault/scheduler': path.resolve(__dirname, 'packages/scheduler/src'),
      '@upfault/runtime': path.resolve(__dirname, 'packages/runtime/src'),
      '@upfault/compiler': path.resolve(__dirname, 'packages/compiler/src'),
      '@upfault/ssr': path.resolve(__dirname, 'packages/ssr/src'),
      '@upfault/cli': path.resolve(__dirname, 'packages/cli/src'),
      '@upfault/devtools': path.resolve(__dirname, 'packages/devtools/src'),
      '@upfault/predict-cache': path.resolve(__dirname, 'packages/predict-cache/src'),
      '@upfault/optimizer': path.resolve(__dirname, 'packages/optimizer/src'),
    },
  },
  esbuild: {
    target: 'esnext',
    format: 'esm',
  },
});
