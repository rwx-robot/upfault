// Final release verification
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const ESBUILD = '/Users/Wang/Code/webfault-lib/faultless-all/faultless/node_modules/esbuild/bin/esbuild';

console.log('🔍 UpFault v0.2.0 发布验证\n');

const checks = [];

// 1. 包版本检查
const pkgs = ['shared', 'scheduler', 'diff', 'reactivity', 'predict-cache', 'compiler', 'cli', 'devtools', 'ssr', 'runtime'];
for (const pkg of pkgs) {
  const pkgJson = JSON.parse(fs.readFileSync(`packages/${pkg}/package.json`, 'utf-8'));
  if (pkgJson.version === '0.2.0') {
    console.log(`✅ ${pkg}: v${pkgJson.version}`);
    checks.push(true);
  } else {
    console.log(`❌ ${pkg}: 版本不匹配 (${pkgJson.version})`);
    checks.push(false);
  }
}

// 2. 构建产物检查
for (const pkg of pkgs) {
  const distPath = `packages/${pkg}/dist/index.mjs`;
  if (fs.existsSync(distPath)) {
    const size = fs.statSync(distPath).size;
    console.log(`✅ ${pkg}/dist/index.mjs: ${(size/1024).toFixed(1)} kB`);
    checks.push(true);
  } else {
    console.log(`❌ ${pkg}: 缺少构建产物`);
    checks.push(false);
  }
}

// 3. SSR hydration 导出检查
const ssrDist = fs.readFileSync('packages/ssr/dist/index.mjs', 'utf-8');
const requiredExports = ['hydrate', 'hydrateRoot', 'hydrateNodeStream', 'hydrateWebStream', 'partialHydrate', 'lazyHydrate', 'isHydrated', 'markHydrated', 'getHydrationState'];
for (const exp of requiredExports) {
  if (ssrDist.includes(exp)) {