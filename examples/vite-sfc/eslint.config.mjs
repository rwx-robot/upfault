// @upfault/eslint-plugin 自带 .uf 解析器：扩展推荐配置即可，无需另装 parser。
// `<script lang="ts">` 的项目再补一段：
//   { files: ['**' + '/*.uf'], languageOptions: { parserOptions: { parser: tsParser } } }
import upfault from '@upfault/eslint-plugin';

export default [
  ...upfault.configs['flat/recommended'],
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
];
