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