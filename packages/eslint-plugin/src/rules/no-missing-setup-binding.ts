/**
 * `upfault/no-missing-setup-binding` —— 脚本顶层声明却忘了从 setup() 暴露
 *
 * UpFault 的模板只能访问两处：`setup()` 的返回值，以及 props
 * （编译产物是 `_ctx.xxx`，而运行时的上下文代理只查这两处）。
 *
 * 于是最经典的坑是：`import TodoList from './TodoList.uf'` 之后直接在模板里写
 * `<TodoList />`，但 setup 的 return 里漏了它 —— 编译能过、运行时 `_ctx.TodoList`
 * 是 undefined，页面白得毫无线索。
 *
 * 判定口径刻意收得很紧，**只对「脚本顶层声明过、又出现在模板里」的名字发问**：
 * props 与全局名都不在「顶层声明」集合内，因此不会误报（UpFault 的 props 没有
 * 静态声明，模板里无从区分）。setup 返回值无法静态判定时（不是对象字面量、
 * 含展开、没有默认导出）整条规则直接收手。
 */

import type { Rule } from 'eslint';
import type { EsNode } from '../estree';
import { collectReferences } from '../expression';
import { collectDeclared, collectSetupReturn } from '../script';
import { eachExpression, eachNode } from '../traverse';
import type { UFComponent } from '../ast';
import { templateBodyOf } from './utils';

const rule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description: '要求脚本顶层声明的绑定必须由 setup() 返回才能在模板中使用',
      recommended: true,
    },
    schema: [],
    messages: {
      missing:
        '模板用到了 `{{name}}`，但 setup() 没有把它 return 出去。UpFault 的模板只能访问 setup() 的返回值与 props（编译产物是 `_ctx.{{name}}`），模块作用域的导入与常量必须显式返回，否则运行时是 undefined。',
    },
  },

  create(context) {
    return {
      Program(node) {
        const body = ((node as unknown as { body?: EsNode[] }).body ?? []).slice();
        const exposed = collectSetupReturn(body);
        if (exposed === null) return; // 判定不了就不猜，宁可不报

        const declared = collectDeclared(body);
        if (declared.size === 0) return;

        const check = (name: string, start: number, end: number): void => {
          if (!declared.has(name) || exposed.has(name)) return;
          context.report({
            loc: {
              start: context.sourceCode.getLocFromIndex(Math.max(0, start)),
              end: context.sourceCode.getLocFromIndex(Math.max(start, end)),
            },
            messageId: 'missing',
            data: { name },
          });
        };

        const template = templateBodyOf(context);

        eachExpression(template, (site) => {
          for (const ref of collectReferences(site.expression)) {
            check(ref.name, ref.start, ref.end);
          }
        });

        // 组件标签不是表达式，但同样编译成 `_ctx.Xxx`，必须一并检查
        eachNode(template, (templateNode) => {
          if (templateNode.type !== 'UFComponent') return;
          const component = templateNode as UFComponent;
          const start = component.range[0] + 1; // 跳过 `<`
          check(component.name, start, start + component.name.length);
        });
      },
    };
  },
};

export default rule;
