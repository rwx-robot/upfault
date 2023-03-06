/**
 * Preview 命令 - 预览生产构建
 */

import { serve } from 'esbuild';
import { resolve } from 'path';
import { existsSync } from 'fs';
import pc from 'picocolors';

export interface PreviewOptions {
  port?: number;
  host?: string;
  config?: string;
}

export async function preview(options: PreviewOptions = {}): Promise<void> {
  const cwd = process.cwd();
  const port = options.port || 4173;