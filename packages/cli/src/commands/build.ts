/**
 * Build 命令 - 构建生产环境包
 */

import { build as esbuildBuild } from 'esbuild';
import { resolve, relative } from 'path';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';