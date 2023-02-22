/**
 * Dev 命令 - 启动开发服务器
 */

import { build as esbuildBuild } from 'esbuild';
import { serve } from 'esbuild';
import chokidar from 'chokidar';
import { resolve, relative } from 'path';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import pc from 'picocolors';
import { loadConfig, findEntryPoints, copyPublicAssets, generateIndexHtml } from './build';

export interface DevOptions {
