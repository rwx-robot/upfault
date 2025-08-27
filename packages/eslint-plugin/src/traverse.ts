/**
 * 模板 AST 遍历
 *
 * `eachExpression` 是规则的主力：它按「表达式所处的语义位置」把所有表达式收集出来。
 * 位置信息很关键 —— 事件处理器里的 `count++` 是**合法**的（晚执行、就是用来改状态的），
 * 但插值里的 `count++` 是事故（每次渲染都执行）。规则靠 role 区分。
 */

import type { UFTemplateNode, UFAttribute, UFExpression } from './ast';

export type ExpressionRole = 'interpolation' | 'attribute' | 'condition' | 'loop-source' | 'loop-key';

export interface ExpressionSite {
  expression: UFExpression;
  role: ExpressionRole;
  /** 表达式所属节点（元素 / 组件 / If / For），便于把问题报在结构上 */
  owner: UFTemplateNode;
  attribute?: UFAttribute;
}

export function eachExpression(
  nodes: UFTemplateNode[],
  visit: (site: ExpressionSite) => void
): void {
  for (const node of nodes) {
    switch (node.type) {
      case 'UFElement':
      case 'UFComponent': {
        for (const attribute of node.attributes) {
          // kind === 'static' 是字面量字符串，不是表达式
          if (!attribute.valueExpression) continue;
          visit({
            expression: attribute.valueExpression,
            role: 'attribute',
            owner: node,
            attribute,
          });
        }
        eachExpression(node.children, visit);
        break;
      }

      case 'UFInterpolation':
        visit({ expression: node.expression, role: 'interpolation', owner: node });
        break;

      case 'UFIf':
        for (const branch of node.branches) {
          if (branch.condition) {
            visit({ expression: branch.condition, role: 'condition', owner: node });
          }
          eachExpression(branch.children, visit);
        }
        break;

      case 'UFFor':
        visit({ expression: node.source, role: 'loop-source', owner: node });
        if (node.key) visit({ expression: node.key, role: 'loop-key', owner: node });
        eachExpression(node.children, visit);
        break;

      default:
        break;
    }
  }
}

/** 遍历所有模板节点 */
export function eachNode(nodes: UFTemplateNode[], visit: (node: UFTemplateNode) => void): void {
  for (const node of nodes) {
    visit(node);
    switch (node.type) {
      case 'UFElement':
      case 'UFComponent':
        eachNode(node.children, visit);
        break;
      case 'UFIf':
        for (const branch of node.branches) eachNode(branch.children, visit);
        break;
      case 'UFFor':
        eachNode(node.children, visit);
        break;
      default:
        break;
    }
  }
}
