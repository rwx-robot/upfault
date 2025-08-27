# @upfault/eslint-plugin

UpFault 的官方 ESLint 插件：为 `.uf` 单文件组件提供**模板与响应式规则**。

与 Vue 生态不同，本插件**自带 `.uf` 解析器** —— 不需要再装 `*-eslint-parser`，
也不需要 processor 把文件拆成虚拟文件。一个 `.uf` 文件会解析成：

```
Program
├── body[]          <script> 块（标准 ESTree，你已有的 JS/TS 规则照常生效）
└── templateBody[]  <template> 块（UF* 自定义节点，本插件的规则在此工作）
```

模板表达式**刻意**不转成 ESTree 节点：一旦 `{{ count }}` 里的 `count` 变成真正的
`Identifier`，`no-undef` 会把所有模板绑定判成未定义（运行时是经 `_ctx` 代理解析的），
造成成片假阳性。需要 AST 的规则自行解析表达式（插件内部已封装好，且位置精确到行列）。

## 用法

flat config（ESLint 9，推荐）：

```js
// eslint.config.mjs
import upfault from '@upfault/eslint-plugin';

export default [
  ...upfault.configs['flat/recommended'],
];
```

`<script lang="ts">` 需要指定内层解析器（与 `vue-eslint-parser` 的约定一致）：

```js
import tsParser from '@typescript-eslint/parser';

export default [
  {
    files: ['**/*.uf'],
    languageOptions: { parserOptions: { parser: tsParser } },
  },
];
```

eslintrc（ESLint 8）：

```json
{ "extends": ["plugin:@upfault/recommended"] }
```

## 规则

| 规则 | 级别 | 说明 |
| --- | --- | --- |
| `upfault/valid-v-for-key` | warn | `v-for` 必须提供 `:key`。AeroDiff 以 key 作为节点身份，缺失会退化成按位置对比：列表增删时既无法跳过未变节点（掉性能），也容易复用错 DOM（掉正确性）。 |
| `upfault/no-v-if-with-v-for` | warn | 同一元素上 `v-if` 与 `v-for` 共存的优先级陷阱。UpFault 固定为 **v-if 在外、v-for 在内**：条件看不到迭代变量，且条件为假时整个列表都不渲染。想要「逐项过滤」请改用 computed。 |
| `upfault/no-side-effect-in-template` | error | 模板的**读位置**表达式里不得出现赋值 / 自增自减 / `new` / `await`。渲染函数每次更新都会重新求值，副作用会随渲染反复执行。事件处理器（`@click="count++"`）不在此列。 |
| `upfault/no-missing-setup-binding` | error | 模板用到了脚本顶层声明（import / const / function…）的名字，但 `setup()` 没有把它 return 出去。UpFault 的模板只能访问 setup 返回值与 props（编译产物是 `_ctx.xxx`），漏 return 的组件在运行时是 `undefined` 且毫无报错。 |

**误报策略**（刻意的取舍）：

- `no-missing-setup-binding` 只对「脚本顶层声明过、又出现在模板里」的名字发问 ——
  props 与全局名都不在顶层声明集合里，因此不会误报；UpFault 的 props 没有静态声明，
  模板里无从区分。当 `setup()` 的返回值无法静态判定（不是对象字面量、含展开、
  没有默认导出）时，整条规则**直接收手**，宁可不报。
- `<script lang="ts">` 未配置 `parserOptions.parser` 时会**抛出解析错误**并给出指引，
  而不是静默跳过脚本的检查（与 `vue-eslint-parser` 行为一致）。

## 位置精度

所有报错都落在 `.uf` 原文上，包括模板里的表达式子串（例如 `:key="t.id"` 里的
`t.id`、`{{ t.text }}` 里的 `t.text`）。实现上只有一条换算规则：编译器给出的相对
偏移 + 模板块起始偏移 = 文件绝对偏移，再由行首索引表查行列。
