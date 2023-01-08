// Final release verification
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const ESBUILD = '/Users/Wang/Code/webfault-lib/faultless-all/faultless/node_modules/esbuild/bin/esbuild';

console.log('🔍 UpFault v0.2.0 发布验证\n');
