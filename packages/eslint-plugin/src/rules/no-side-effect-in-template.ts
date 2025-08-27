/**
 * `upfault/no-side-effect-in-template` —— 模板表达式里不要写副作用
 *
 * 渲染函数每次更新都会重新求值模板表达式，因此 `{{ count++ }}` 这类写法会在
 * 每次渲染时改状态 —— 而改状态又触发下一次渲染，容易形成更新风暴或难以复现的抖动。
 *
 * 只检查「读位置」：`@click="count++"` 是事件处理器，本来就在事件发生时执行，
 * 完全合法，不在此规则的射程内。
 */

import type { Rule } from 'eslint';
import { findSideEffects } from '../expression';
import { eachExpression } from '../traverse';
import { locOf, templateBodyOf } from './utils';

const rule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description: '禁止在模板的读位置表达式里写副作用（赋值 / 自增 / new / await）',
      recommended: true,
    },
    schema: [],
    messages: {
      sideEffect:
        '模板表达式里出现了{{kind}}。渲染函数每次更新都会重新求值，副作用会随渲染反复执行（并可能再次触发渲染）。请把计算挪进 computed 或事件处理器。',
    },
  },

  create(context) {
    return {
      Program() {
        eachExpression(templateBodyOf(context), (site) => {
          // 事件处理器是「发生时才执行」，允许副作用
          if (site.role === 'attribute' && site.attribute?.kind === 'event') return;
          for (const effect of findSideEffects(site.expression)) {
            context.report({
              loc: locOf(context, [effect.start, effect.end]),
              messageId: 'sideEffect',
              data: { kind: effect.kind },
            });
          }
        });
      },
    };
  },
};

export default rule;
