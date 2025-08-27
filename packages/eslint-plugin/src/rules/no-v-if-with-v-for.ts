/**
 * `upfault/no-v-if-with-v-for` —— 同一元素上同时写 v-if 与 v-for
 *
 * UpFault 的嵌套顺序固定为 **v-if 在外、v-for 在内**（与 Vue 3 的求值顺序一致）：
 *
 *     <li v-if="show" v-for="t in items" :key="t.id">   ⇒   show ? items.map(...) : null
 *
 * 于是两个反直觉点：
 * 1. 条件表达式处在元素自身作用域，**看不到迭代变量** —— 写 `v-if="t.done"` 会取到 undefined；
 * 2. 条件为假时整个列表都不渲染，而不是「逐项过滤」（不少人想要的是后者）。
 *
 * 这条规则不禁止写法（语义是明确的），只要求作者确认意图。
 */

import type { Rule } from 'eslint';
import type { UFIf } from '../ast';
import { isSameElement } from '../ast';
import { locOf } from './utils';

const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: '提示同一元素上 v-if 与 v-for 共存的优先级陷阱',
      recommended: true,
    },
    schema: [],
    messages: {
      sameElement:
        '同一元素上同时写了 v-if 与 v-for。UpFault 的嵌套顺序是 v-if 在外、v-for 在内：条件里**看不到迭代变量**，且条件为假时**整个列表**都不渲染。若想要的是「按条件过滤列表」，请换成 computed 先过滤；若确实要整体开关，建议把 v-if 移到外层容器上，语义更清楚。',
    },
  },

  create(context) {
    return {
      UFIf(node: unknown) {
        const ifNode = node as unknown as UFIf;
        for (const branch of ifNode.branches) {
          for (const child of branch.children) {
            if (child.type !== 'UFFor') continue;
            if (!isSameElement(ifNode, child)) continue;
            // 报在 v-if 属性上：位置精确，且不与 v-for 的报错重叠
            context.report({ loc: locOf(context, branch.range), messageId: 'sameElement' });
          }
        }
      },
    };
  },
};

export default rule;
