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