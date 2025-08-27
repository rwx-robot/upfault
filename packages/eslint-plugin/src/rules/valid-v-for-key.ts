/**
 * `upfault/valid-v-for-key` —— v-for 必须提供 :key
 *
 * AeroDiff 的键控匹配以 key 作为节点身份。缺 key 时会退化成按位置对比：
 * 列表中间插入一项，后面所有项都会被判定为「变了」而重建；
 * 若宿主元素带状态（输入框内容、焦点、动画），还会被错误复用。
 */

import type { Rule } from 'eslint';
import type { UFFor } from '../ast';
import { locOf } from './utils';

const rule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description: '要求 v-for 必须提供 :key',
      recommended: true,
    },
    schema: [],
    messages: {
      missingKey:
        'v-for 缺少 :key。UpFault 的 AeroDiff 以 key 作为节点身份：没有 key 只能按位置对比，列表增删时既无法跳过未变节点（掉性能），也容易复用错 DOM（掉正确性，带状态的宿主元素尤其明显）。',
    },
  },

  create(context) {
    return {
      UFFor(node: unknown) {
        const forNode = node as unknown as UFFor;
        if (forNode.key) return;
        context.report({ loc: locOf(context, forNode.range), messageId: 'missingKey' });
      },
    };
  },
};

export default rule;
