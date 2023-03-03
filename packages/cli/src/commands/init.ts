/**
 * Init 命令 - 初始化新项目
 */

import { resolve } from 'path';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import pc from 'picocolors';

export interface InitOptions {
  template?: 'vanilla' | 'react' | 'vue';
  force?: boolean;
  config?: string;
}

export async function init(projectName: string, options: InitOptions = {}): Promise<void> {
  const template = options.template || 'vanilla';
  const force = options.force || false;
  const cwd = process.cwd();
  const targetDir = projectName ? resolve(cwd, projectName) : cwd;
  const dirName = projectName || '.';

  console.log(pc.cyan('🎉 初始化 UpFault 项目...'));
  console.log(pc.gray(`模板: ${template}`));
  console.log(pc.gray(`目标目录: ${targetDir}`));

  if (existsSync(targetDir) && !force) {
    const { default: prompts } = await import('prompts');
    const response = await prompts({
      type: 'confirm',
      name: 'overwrite',
      message: `目录 "${dirName}" 已存在，是否覆盖？`,
      initial: false,
    });
    if (!response.overwrite) {
      console.log(pc.yellow('操作已取消'));
      return;
    }
  }

  if (!existsSync(targetDir)) {
    mkdirSync(targetDir, { recursive: true });
  }

  const templateFiles = getTemplateFiles(template);
  
  for (const [file, content] of Object.entries(templateFiles)) {
    const filePath = resolve(targetDir, file);
    const dir = resolve(targetDir, file.split('/').slice(0, -1).join('/'));
    
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    
    writeFileSync(filePath, content);
    console.log(pc.gray(`  创建: ${file}`));
  }

  console.log(pc.green('\n✅ 项目初始化完成!'));
  console.log(pc.cyan('\n📋 下一步:'));
  if (projectName) {
    console.log(pc.gray(`  cd ${projectName}`));
  }
  console.log(pc.gray('  pnpm install'));
  console.log(pc.gray('  pnpm dev'));
  console.log(pc.cyan('\n📚 更多信息请访问: https://upfault.dev'));
}

function getTemplateFiles(template: string): Record<string, string> {
  const baseFiles = {
    'package.json': JSON.stringify({
      name: 'upfault-app',
      version: '0.2.0',
      private: true,
      type: 'module',
      scripts: {
        dev: 'upfault dev',
        build: 'upfault build',
        preview: 'upfault preview',
      },
      dependencies: {
        '@upfault/runtime': 'workspace:*',
        '@upfault/reactivity': 'workspace:*',
        '@upfault/shared': 'workspace:*',
      },
      devDependencies: {
        '@upfault/cli': 'workspace:*',
        'typescript': '^5.4.0',
        'vitest': '^1.4.0',
      },
    }, null, 2),
    'tsconfig.json': JSON.stringify({
      compilerOptions: {
        target: 'ES2020',
        module: 'ESNext',
        moduleResolution: 'bundler',
        lib: ['ES2020', 'DOM', 'DOM.Iterable'],
        jsx: 'react-jsx',
        jsxImportSource: '@upfault/runtime',
        strict: true,
        noEmit: true,
        skipLibCheck: true,
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        forceConsistentCasingInFileNames: true,
        resolveJsonModule: true,
        isolatedModules: true,
        baseUrl: '.',
        paths: {
          '@/*': ['src/*'],
        },
      },
      include: ['src/**/*', 'index.html'],
      exclude: ['node_modules', 'dist'],
    }, null, 2),
    'index.html': `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>UpFault App</title>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/main.ts"></script>
</body>
</html>`,
    'src/main.ts': `import { h, createRenderer, defaultRendererOptions } from '@upfault/runtime';
import { ref } from '@upfault/reactivity';

// 创建渲染器
const renderer = createRenderer(defaultRendererOptions);

const container = document.getElementById('app')!;
const count = ref(0);

function App() {
  return h('div', { class: 'app' }, [
    h('h1', null, 'UpFault App'),
    h('p', null, \`计数: \${count.value}\`),
    h('button', { 
      onClick: () => count.value++,
      class: 'btn'
    }, '增加'),
    h('button', { 
      onClick: () => count.value--,
      class: 'btn'
    }, '减少'),
  ]);
}

renderer.render(h(App), container);

// 热更新支持
if (import.meta.hot) {
  import.meta.hot.accept(() => {
    renderer.render(h(App), container);
  });
}`,
    'src/style.css': `:root {
  --primary-color: #3b82f6;
  --bg-color: #f8fafc;
  --text-color: #1e293b;
  --border-radius: 8px;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: var(--bg-color);
  color: var(--text-color);
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 2rem;
}

.app {
  background: white;
  padding: 2rem;
  border-radius: var(--border-radius);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  text-align: center;
  min-width: 300px;
}

h1 {
  margin-top: 0;
  margin-bottom: 1rem;
  color: var(--primary-color);
}

.btn {
  background: var(--primary-color);
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: var(--border-radius);
  cursor: pointer;
  margin: 0 0.25rem;
  font-size: 1rem;
  transition: background 0.2s;
}

.btn:hover {
  background: #2563eb;
}

.btn:active {
  transform: scale(0.98);
}`,
    'upfault.config.json': JSON.stringify({
      entryPoints: ['src/main.ts'],
      publicDir: 'public',
      generateHtml: true,
      title: 'UpFault App',
    }, null, 2),
    '.gitignore': `node_modules
dist
.upfault-dev
*.log
.DS_Store
*.local`,
  };

  if (template === 'react') {
    return {
      ...baseFiles,
      'package.json': JSON.stringify({