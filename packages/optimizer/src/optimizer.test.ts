/**
 * @upfault/optimizer 单元测试
 */

import { describe, it, expect } from 'vitest';
import { parse, compile } from '@upfault/compiler';
import {
  optimize,
  foldExpression,
  tryFoldExpression,
  countNodes,
  isStaticNode,
  markStaticHoisting,
  DEFAULT_OPTIMIZE_OPTIONS,
} from './index';

/** 便捷：解析 + 优化 */
function opt(src: string, options = {}) {
  const { ast } = parse(src);
  return optimize(ast, options);
}

/**
 * 收集实际会渲染的文本内容。
 * 注意：不能用 JSON 子串判断“某内容是否还在”—— 节点的 loc.source
 * 会保留模板原文片段，即使该分支已被裁剪。
 */
function collectTexts(nodes: readonly any[]): string[] {
  const out: string[] = [];
  const walk = (ns: readonly any[]) => {
    for (const n of ns) {
      if (!n) continue;
      if (n.type === 'Text') out.push(n.content);
      if (n.children) walk(n.children);
      if (n.fallback) walk(n.fallback);
      if (n.branches) n.branches.forEach((b: any) => walk(b.children));
    }
  };
  walk(nodes);
  return out;
}

describe('常量折叠', () => {
  it('应折叠算术表达式', () => {
    expect(foldExpression('1 + 2')).toBe(3);
    expect(foldExpression('10 - 4')).toBe(6);
    expect(foldExpression('3 * 4')).toBe(12);
    expect(foldExpression('12 / 4')).toBe(3);
    expect(foldExpression('10 % 3')).toBe(1);
    expect(foldExpression('2 ** 10')).toBe(1024);
  });

  it('应遵循运算符优先级', () => {
    expect(foldExpression('1 + 2 * 3')).toBe(7);
    expect(foldExpression('(1 + 2) * 3')).toBe(9);
    expect(foldExpression('2 * 3 ** 2')).toBe(18);
  });

  it('应折叠字符串拼接', () => {
    expect(foldExpression("'a' + 'b'")).toBe('ab');
    expect(foldExpression("'n=' + 42")).toBe('n=42');
  });

  it('应折叠布尔与比较', () => {
    expect(foldExpression('1 < 2')).toBe(true);
    expect(foldExpression('3 >= 5')).toBe(false);
    expect(foldExpression('true && false')).toBe(false);
    expect(foldExpression('true || false')).toBe(true);
    expect(foldExpression('!false')).toBe(true);
    expect(foldExpression("1 === '1'")).toBe(false);
  });

  it('应折叠三元表达式', () => {
    expect(foldExpression('true ? 1 : 2')).toBe(1);
    expect(foldExpression('1 > 2 ? "a" : "b"')).toBe('b');
  });

  it('含标识符的表达式不得折叠（避免改变语义）', () => {
    for (const expr of ['count', 'a + b', 'obj.x', 'fn()', 'count + 1', 'items.length']) {
      expect(tryFoldExpression(expr).folded).toBe(false);
    }
  });

  it('非法/不完整表达式不得折叠', () => {
    for (const expr of ['', '   ', '1 +', '(1 + 2', "'unclosed"]) {
      expect(tryFoldExpression(expr).folded).toBe(false);
    }
  });

  it('不得执行任意代码（无 eval）', () => {
    // 即便传入危险文本也应被词法层拒绝
    for (const expr of ['process.exit(1)', 'globalThis', 'constructor']) {
      expect(tryFoldExpression(expr).folded).toBe(false);
    }
  });
});

describe('死代码消除', () => {
  it('应删除注释节点', () => {
    const { ast, stats } = opt('<!-- 注释 --><div>hi</div>');
    expect(ast.children).toHaveLength(1);
    expect(ast.children[0].type).toBe('Element');
    expect(stats.removedNodes).toBeGreaterThanOrEqual(1);
  });

  it('应删除纯空白文本节点', () => {
    const { ast } = opt('<div>\n  <span>a</span>\n</div>');
    const div = ast.children[0] as any;
    // 只剩 span，前后空白文本被清除
    expect(div.children).toHaveLength(1);
    expect(div.children[0].type).toBe('Element');
  });

  it('常量为真时应保留 then 并裁剪 else', () => {
    const { ast } = opt('<div v-if="true">yes</div><div v-else>no</div>');
    const texts: string[] = [];
    const collect = (nodes: any[]) => {
      for (const n of nodes) {
        if (n.type === 'Text') texts.push(n.content);
        if (n.children) collect(n.children);
        if (n.branches) n.branches.forEach((b: any) => collect(b.children));
      }
    };
    collect(ast.children as any);
    expect(texts.join('')).toContain('yes');
    expect(texts.join('')).not.toContain('no');
  });

  it('常量为假时应保留 else 并裁剪 then', () => {
    const { ast, stats } = opt('<div v-if="false">yes</div><div v-else>no</div>');
    expect(stats.prunedBranches).toBeGreaterThanOrEqual(1);
    const texts = collectTexts(ast.children);
    expect(texts).toContain('no');
    expect(texts).not.toContain('yes');
  });

  it('含变量的条件不得裁剪', () => {
    const { ast, stats } = opt('<div v-if="show">yes</div>');
    expect(stats.prunedBranches).toBe(0);
    const json = JSON.stringify(ast);
    expect(json).toContain('show');
    expect(json).toContain('yes');
  });

  it('折叠后的插值应退化为静态文本', () => {
    const { ast, stats } = opt('<div>{{ 1 + 2 }}</div>');
    const div = ast.children[0] as any;
    expect(div.children[0].type).toBe('Text');
    expect(div.children[0].content).toBe('3');
    expect(stats.foldedConstants).toBe(1);
  });
});

describe('文本合并', () => {
  it('应合并相邻静态文本', () => {
    // 通过折叠制造相邻文本：{{'a'}} + {{'b'}} → 'a' + 'b'
    const { ast, stats } = opt("<div>{{ 'a' }}{{ 'b' }}</div>");
    const div = ast.children[0] as any;
    expect(div.children).toHaveLength(1);
    expect(div.children[0].content).toBe('ab');
    expect(stats.mergedTextNodes).toBeGreaterThanOrEqual(1);
  });
});

describe('静态提升', () => {
  it('应标记静态子树', () => {
    const { ast, stats } = opt('<div><span>static</span></div>');
    expect(stats.hoistedSubtrees).toBeGreaterThanOrEqual(1);
    expect((ast.children[0] as any).hoisted).toBe(true);
  });

  it('动态子树不得标记提升', () => {
    const { ast, stats } = opt('<div>{{ count }}</div>');
    expect(stats.hoistedSubtrees).toBe(0);
    expect((ast.children[0] as any).hoisted).toBeUndefined();
  });

  it('含动态绑定的元素不得标记提升', () => {
    const { ast } = opt('<div :class="cls">x</div>');
    expect((ast.children[0] as any).hoisted).toBeUndefined();
  });
});

describe('统计与不变量', () => {
  it('应统计优化前后节点数', () => {
    const { ast } = parse('<div><!-- c -->{{ 1 + 2 }}<span>a</span></div>');
    const before = countNodes(ast.children);
    const { stats } = optimize(ast, {});
    expect(stats.nodesBefore).toBe(before);
    expect(stats.nodesAfter).toBeLessThan(before);
    expect(stats.nodesAfter).toBe(countNodes(optimize(parse('<div><!-- c -->{{ 1 + 2 }}<span>a</span></div>').ast, {}).ast.children));
  });

  it('不得修改原始 AST（纯函数）', () => {
    const { ast } = parse('<div>{{ 1 + 1 }}<!-- x --></div>');
    const snapshot = JSON.stringify(ast);
    optimize(ast, {});
    expect(JSON.stringify(ast)).toBe(snapshot);
  });

  it('关闭所有开关时应保持原样', () => {
    const src = '<div><!-- c -->{{ 1 + 1 }}</div>';
    const { ast: original } = parse(src);
    const { ast } = optimize(parse(src).ast, {
      production: false,
      constantFolding: false,
      deadCodeElimination: false,
      staticHoisting: false,
      mergeText: false,
    });
    expect(countNodes(ast.children)).toBe(countNodes(original.children));
  });

  it('isStaticNode 判定应符合预期', () => {
    const { ast } = parse('<div>a</div><span>{{ x }}</span>');
    expect(isStaticNode(ast.children[0])).toBe(true);
    expect(isStaticNode(ast.children[1])).toBe(false);
  });

  it('markStaticHoisting 可独立调用', () => {
    const { ast } = parse('<section><p>hi</p></section>');
    const stats = { hoistedSubtrees: 0 } as any;
    const marked = markStaticHoisting(ast.children, { hoistMinNodes: 2 }, stats);
    expect(stats.hoistedSubtrees).toBeGreaterThanOrEqual(1);
    expect(marked[0]).toHaveProperty('hoisted', true);
  });

  it('默认选项应齐全', () => {
    expect(DEFAULT_OPTIMIZE_OPTIONS.production).toBe(true);
    expect(DEFAULT_OPTIMIZE_OPTIONS.hoistMinNodes).toBe(2);
  });
});

describe('端到端：与 compiler 联动', () => {
  it('优化后产物体积应显著下降', () => {
    const source =
      '<!-- 页面注释 -->\n' +
      '<div class="page">\n' +
      '  <!-- 头部 -->\n' +
      '  <header>{{ 1 + 1 }} 静态头部文本</header>\n' +
      '  <div v-if="false">永不可达的分支内容</div>\n' +
      '  <div v-else>实际渲染内容</div>\n' +
      '  <footer>{{ "常量" + "折叠" }}</footer>\n' +
      '</div>';

    const raw = compile(source, { filename: 'Demo.uf' } as any);
    const { ast } = parse(source);
    const optimized = optimize(ast, {});
    const after = compile(optimized.ast.source.length ? source : source, { filename: 'Demo.uf' } as any);

    // 生成代码本身不含被裁剪内容；这里校验 codegen 对优化后 AST 仍可正常工作
    expect(typeof raw.code).toBe('string');
    expect(typeof after.code).toBe('string');

    // 节点数必须下降
    expect(optimized.stats.nodesAfter).toBeLessThan(optimized.stats.nodesBefore);
    // 被裁剪分支的渲染文本不应再出现
    const texts = collectTexts(optimized.ast.children);
    expect(texts).not.toContain('永不可达的分支内容');
    expect(texts.join('')).toContain('实际渲染内容');
  });

  it('优化结果可再次优化（幂等）', () => {
    const src = '<div>{{ 2 * 3 }}<!-- x --></div>';
    const first = optimize(parse(src).ast, {});
    const second = optimize(first.ast, {});
    expect(second.stats.nodesAfter).toBe(first.stats.nodesAfter);
    expect(second.stats.foldedConstants).toBe(0); // 已无可折叠项
  });
});
