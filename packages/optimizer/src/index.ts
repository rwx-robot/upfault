/**
 * @upfault/optimizer - UpFault 编译时优化器
 *
 * 版本: 0.2.0（随框架主线；v0.3 "Maturity" 的 M4 交付物）
 */

export {
  optimize,
  foldExpression,
} from './optimizer';

export {
  tryFoldExpression,
  renderFoldedValue,
} from './constant-fold';

export {
  eliminateDeadCode,
  mergeAdjacentText,
  countNodes,
  isStaticNode,
} from './dce';

export {
  markStaticHoisting,
} from './hoist';

export {
  DEFAULT_OPTIMIZE_OPTIONS,
  type OptimizeOptions,
  type OptimizeResult,
  type OptimizeStats,
  type FoldResult,
  type OptimizedNode,
} from './types';

export const VERSION = '0.2.0';
export const PACKAGE_NAME = '@upfault/optimizer';
