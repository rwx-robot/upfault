/**
 * @upfault/cli - UpFault 命令行工具
 * 
 * 提供构建、开发服务器、预览等功能
 * 版本: 0.2.0
 */

import { Command } from 'commander';
import { build } from './commands/build';
import { dev } from './commands/dev';
import { preview } from './commands/preview';
import { init } from './commands/init';
import { VERSION } from './version';

const program = new Command();

program
  .name('upfault')
  .description('UpFault 前端框架 CLI 工具')
  .version(VERSION)
  .option('-c, --config <path>', '配置文件路径')
  .option('-v, --verbose', '详细输出');

program
  .command('build')
  .description('构建生产环境包')
  .option('-o, --out-dir <dir>', '输出目录', 'dist')
  .option('--minify', '启用压缩', true)
  .option('--sourcemap', '生成 sourcemap', true)
  .action(build);
