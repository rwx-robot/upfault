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
