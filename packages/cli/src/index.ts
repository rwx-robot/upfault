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

program
  .command('dev')
  .description('启动开发服务器')
  .option('-p, --port <port>', '端口号', '3000')
  .option('-o, --open', '自动打开浏览器', false)
  .option('--host <host>', '监听地址', 'localhost')
  .action(dev);

program
  .command('preview')
  .description('预览生产构建')
  .option('-p, --port <port>', '端口号', '4173')
  .option('--host <host>', '监听地址', 'localhost')
  .action(preview);

program
  .command('init')
  .description('初始化新项目')