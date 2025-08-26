/**
 * renderer-options.ts — 仅保留渲染器类型定义。
 *
 * ⚠️ 历史教训（2026-09-21 发版评审发现）：本文件曾包含一个标注
 * "Simplified implementation for SSR" 的空壳 createRenderer（render 内只有
 * 注释、mount 为 () => {}），而 index.ts 恰好从这里导出实现，导致完整实现
 * renderer.ts 从未被使用，dist 产物也是空壳 —— Renderer 相关 14+ 个测试
 * 全部失败且从未被发版前评审发现。
 *
 * 现在：实现统一从 renderer.ts 导出（见 index.ts），本文件只留类型。
 */

export interface RendererOptions<
  HostElement extends Node = Element,
  HostText extends Node = Text,
  HostComment extends Node = Comment
> {
  createElement: (tag: string, isSVG?: boolean) => HostElement;
  createText: (text: string) => HostText;
  createComment: (text: string) => HostComment;
  setElementText: (el: HostElement, text: string) => void;
  setText: (node: HostText, text: string) => void;
  insert: (child: Node, parent: HostElement, anchor?: HostElement | null) => void;
  remove: (child: Node) => void;
  patchProp: (el: HostElement, key: string, prevValue: any, nextValue: any) => void;
  parentNode?: (node: HostElement) => HostElement | null;
  nextSibling?: (node: HostElement) => HostElement | null;
  addEventListener?: (el: HostElement, event: string, handler: EventListener) => void;
  removeEventListener?: (el: HostElement, event: string, handler: EventListener) => void;
  _nodeToElement?: (node: Node) => HostElement | null;
}
