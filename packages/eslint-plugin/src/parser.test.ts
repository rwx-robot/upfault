import { describe, it, expect } from 'vitest';
import * as acorn from 'acorn';
import { parseForESLint } from './parser';
import type { UFTemplateNode, UFFor, UFInterpolation, UFElement } from './ast';

// 注意行号：下面这份 SFC 的行列被测试当契约断言，改动缩进必须同步改期望值
const SFC = `<template>
  <section class="app">
    <ul>
      <li v-for="t in items" :key="t.id">{{ t.text }}</li>
    </ul>
  </section>
</template>

<script>
import { ref } from '@upfault/runtime';
export default {
  setup() {
    const items = ref([]);
    return { items };
  },
};
</script>
`;

function flatten(nodes: UFTemplateNode[], out: UFTemplateNode[] = []): UFTemplateNode[] {
  for (const node of nodes) {
    out.push(node);
    if (node.type === 'UFElement' || node.type === 'UFComponent') flatten(node.children, out);
    else if (node.type === 'UFIf') for (const b of node.branches) flatten(b.children, out);
    else if (node.type === 'UFFor') flatten(node.children, out);
  }
  return out;
}

describe('.uf 解析器（parseForESLint）', () => {
  const result = parseForESLint(SFC, { filePath: 'App.uf' });
  const nodes = flatten(result.ast.templateBody);
  const text = SFC;

  it('脚本块进入 Program.body，且位置与 .uf 原文一致', () => {
    const types = (result.ast.body as unknown as { type: string }[]).map((n) => n.type);
    expect(types).toEqual(['ImportDeclaration', 'ExportDefaultDeclaration']);
    const exportNode = result.ast.body[1] as unknown as { loc: { start: { line: number } } };
    // 补齐换行后，acorn 的 loc 直接就是文件坐标：export default 在第 11 行
    expect(exportNode.loc.start.line).toBe(11);
  });

  it('脚本声明与 setup 返回值可被静态取出', () => {
    const exportNode = result.ast.body[1] as unknown as {
      declaration: { properties: { key: { name: string } }[] };
    };
    const setup = exportNode.declaration.properties.find((p) => p.key?.name === 'setup');
    expect(setup).toBeDefined();
  });

  it('模板节点带真实 range，可直接切回原文', () => {
    const li = nodes.find((n) => n.type === 'UFFor') as UFFor;
    expect(text.slice(li.range[0], li.range[1])).toContain('<li v-for="t in items"');
    expect(text.slice(li.range[0], li.range[0] + 3)).toBe('<li');
  });

  it('v-for 的迭代源与 :key 各自定位到指令值', () => {
    const li = nodes.find((n) => n.type === 'UFFor') as UFFor;
    expect(li.value).toBe('t');
    expect(li.source.raw).toBe('items');
    expect(li.source.loc.start).toEqual({ line: 4, column: 22 });
    expect(li.key?.raw).toBe('t.id');
    expect(li.key?.loc.start).toEqual({ line: 4, column: 35 });
    expect(text.slice(li.key!.range[0], li.key!.range[1])).toBe('t.id');
  });

  it('插值表达式的行列精确落在 mustache 上', () => {
    const interp = nodes.find((n) => n.type === 'UFInterpolation') as UFInterpolation;
    expect(interp.expression.raw).toBe('t.text');
    expect(interp.expression.loc.start).toEqual({ line: 4, column: 44 });
    // v-for 作用域内的表达式应带上迭代变量，供规则屏蔽局部名
    expect(interp.expression.locals).toEqual(['t']);
  });

  it('静态属性没有表达式，动态属性有', () => {
    const section = nodes.find((n) => n.type === 'UFElement' && (n as UFElement).tag === 'section') as UFElement;
    const cls = section.attributes.find((a) => a.name === 'class')!;
    expect(cls.kind).toBe('static');
    expect(cls.valueExpression).toBeNull();

    const li = nodes.find((n) => n.type === 'UFFor') as UFFor;
    const host = li.children.find((n) => n.type === 'UFElement') as UFElement;
    const classAttr = host.attributes.find((a) => a.name === 'class');
    expect(classAttr).toBeUndefined();
  });

  it('visitorKeys 覆盖模板节点，且 Program 额外遍历 templateBody', () => {
    expect(result.visitorKeys['UFElement']).toEqual(['attributes', 'children']);
    expect(result.visitorKeys['Program']).toContain('templateBody');
    // 必须保留标准 ESTree 键，否则脚本块的既有规则会被静默跳过
    expect(result.visitorKeys['Program']).toContain('body');
    expect(result.visitorKeys['ArrowFunctionExpression']).toContain('body');
  });

  it('非 JS 脚本内语言：未配置内层解析器时直接抛错并给出指引', () => {
    const ts = `<template><p>x</p></template>\n<script lang="ts">export default { setup(): object { return {}; } };</script>\n`;
    expect(() => parseForESLint(ts, { filePath: 'A.uf' })).toThrow(/parserOptions\.parser/);
  });

  it('配置内层解析器后 TS 脚本可用（这里用 acorn 冒充，验证委派链路）', () => {
    const ts = `<template><p>{{ label }}</p></template>\n<script lang="ts">export default {};</script>\n`;
    const inner = {
      parse: (code: string) => acorn.parse(code, { ecmaVersion: 'latest', sourceType: 'module', locations: true, ranges: true }),
    };
    const parsed = parseForESLint(ts, { filePath: 'A.uf', parserOptions: { parser: inner } });
    expect(parsed.ast.body).toHaveLength(1);
  });
});
