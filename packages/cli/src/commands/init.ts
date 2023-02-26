/**
 * Init 命令 - 初始化新项目
 */

import { resolve } from 'path';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import pc from 'picocolors';

export interface InitOptions {