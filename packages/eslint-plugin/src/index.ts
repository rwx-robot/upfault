// @upfault/eslint-plugin —— `.uf` 单文件组件的 ESLint 插件
//
// 与 Vue 生态的差别：本插件**自带解析器**，用户不需要额外装 `*-eslint-parser`。
//
// 用法（flat config，ESLint 9）：
//
//     import upfault from '@upfault/eslint-plugin';
//     export default [ ...upfault.configs['flat/recommended'] ];
//
//   `<script lang="ts">` 需要指定内层解析器，在文件级配置里补：
//
//     {
//       files: ['**' + '/*.uf'],
//       languageOptions: { parserOptions: { parser: tsParser } },
//     }
//
// 用法（eslintrc，ESLint 8）：
//
//     { "extends": ["plugin:@upfault/recommended"] }

import { parse, parseForESLint, parser } from './parser';
import noMissingSetupBinding from './rules/no-missing-setup-binding';
import noSideEffectInTemplate from './rules/no-side-effect-in-template';
import noVIfWithVFor from './rules/no-v-if-with-v-for';
import validVForKey from './rules/valid-v-for-key';

export const VERSION = '0.2.0';
export const PACKAGE_NAME = '@upfault/eslint-plugin';

const rules = {
  'valid-v-for-key': validVForKey,
  'no-v-if-with-v-for': noVIfWithVFor,
  'no-side-effect-in-template': noSideEffectInTemplate,
  'no-missing-setup-binding': noMissingSetupBinding,
};

const recommendedRules: Record<string, 'error' | 'warn'> = {
  'upfault/valid-v-for-key': 'warn',
  'upfault/no-v-if-with-v-for': 'warn',
  'upfault/no-side-effect-in-template': 'error',
  'upfault/no-missing-setup-binding': 'error',
};

const plugin = {
  meta: { name: PACKAGE_NAME, version: VERSION },
  parser,
  rules,
  configs: {} as Record<string, unknown>,
};

/** eslintrc 风格配置 */
const eslintrcRecommended = {
  plugins: ['upfault'],
  rules: recommendedRules,
};

/** flat config 风格配置：文件匹配、插件、解析器与规则一并给出 */
const flatRecommended = [
  {
    name: 'upfault/recommended',
    files: ['**/*.uf'],
    plugins: { upfault: plugin },
    languageOptions: {
      parser: plugin.parser,
      parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
    },
    rules: recommendedRules,
  },
];

plugin.configs['recommended'] = eslintrcRecommended;
plugin.configs['flat/recommended'] = flatRecommended;

export { plugin, rules, parseForESLint, parse, parser };
export default plugin;
