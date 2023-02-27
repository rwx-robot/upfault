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