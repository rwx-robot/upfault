/**
 * UpFault Runtime - VNode Creation (h function)
 * 
 * 虚拟节点创建工具，兼容 JSX transform
 * 参考 Vue 3 h() 设计
 */

import type {
  VNode,
  VNodeProps,
  PatchFlags,
  Component,
  ComponentInstance,
  Ref,
} from '@upfault/shared/diff';

import { VNodeType, PatchFlags as SharedPatchFlags } from '@upfault/shared/diff';

// Re-export from shared
export type { VNode, VNodeProps, Component, ComponentInstance, Ref } from '@upfault/shared/diff';
export { VNodeType } from '@upfault/shared/diff';

// ============================================================================
// 类型定义
// ============================================================================

/**
 * Props 标准化后的类型
 */
export interface NormalizedProps extends Record<string, any> {
  key?: string | number | null;
  ref?: Ref<any> | ((value: any) => void);
  class?: string | Record<string, boolean> | string[];
  style?: string | Record<string, string | number>;
  onClick?: (e: Event) => void;
  onInput?: (e: Event) => void;
  onChange?: (e: Event) => void;
  onSubmit?: (e: Event) => void;
  [key: `on${string}`]: ((e: Event) => void) | undefined;
  [key: string]: any;
}

/**
 * VNode 子节点类型
 */
export type VNodeChild = 
  | VNode 
  | string 
  | number 
  | boolean 
  | null 
  | undefined 
  | VNodeChild[];

/**
 * 组件类型
 */
export type ComponentType = 
  | string 
  | Component 
  | ComponentInstance 
  | (new () => ComponentInstance);

/**
 * h() 函数重载签名
 */
export interface HFunction {
  // Element
  (type: string, props?: NormalizedProps | null, ...children: VNodeChild[]): VNode;
  (type: string, ...children: VNodeChild[]): VNode;
  
  // Component
  (type: ComponentType, props?: NormalizedProps | null, ...children: VNodeChild[]): VNode;
  (type: ComponentType, ...children: VNodeChild[]): VNode;
}

// ============================================================================
// 内部工具函数
// ============================================================================

/**
 * 标准化 class 值
 */
function normalizeClass(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    return value
      .filter(v => v != null)
      .map(v => normalizeClass(v))
      .filter(Boolean)
      .join(' ');
  }
  if (typeof value === 'object') {
    return Object.entries(value as Record<string, any>)
      .filter(([, v]) => v)
      .map(([k]) => k)
      .join(' ');
  }
  return undefined;
}

/**
 * 标准化 style 值
 */
function normalizeStyle(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    return Object.entries(value as Record<string, any>)
      .filter(([, v]) => v != null)
      .map(([k, v]) => `${kebabCase(k)}:${v}`)
      .join(';');
  }
  return undefined;
}

/**
 * 驼峰转 kebab-case
 */
function kebabCase(str: string): string {
  return str.replace(/([A-Z])/g, '-$1').toLowerCase();
}

/**
 * 标准化 props
 */
function normalizeProps(props: NormalizedProps | null | undefined): VNodeProps {
  if (!props) return {};
  
  const normalized: VNodeProps = { ...props };
  
  // 处理 class
  if (normalized.class != null) {
    normalized.class = normalizeClass(normalized.class);
  }
  
  // 处理 style
  if (normalized.style != null) {
    normalized.style = normalizeStyle(normalized.style);
  }
  
  // 移除 ref 和 key（它们单独存储）
  const { key, ref, ...rest } = normalized;
  
  return rest;
}

/**
 * 标准化 children
 */
function normalizeChildren(children: VNodeChild[]): VNode[] | null {
  if (children.length === 0) return null;
  // 单个子节点，也返回数组
  if (children.length === 1) {
    const child = children[0];
    if (child == null) return [];
    if (typeof child === 'string' || typeof child === 'number') {
      return [{ type: Text, children: String(child), props: null, key: null, ref: null, shapeFlag: VNodeShapeFlags.TEXT_NODE, patchFlag: SharedPatchFlags.NONE, dynamicProps: [], el: null, anchor: null, parent: null, componentInstance: null, component: undefined, vnodeType: VNodeType.TEXT }];
    }
    if (Array.isArray(child)) {
      return normalizeChildren(child);
    }
    return [child];
  }
  // 多个子节点，展平数组
  return children.flatMap(child => {
    if (child == null) return [];
    if (Array.isArray(child)) return normalizeChildren(child);
    if (typeof child === 'string' || typeof child === 'number') {
      return [{ type: Text, children: String(child), props: null, key: null, ref: null, shapeFlag: VNodeShapeFlags.TEXT_NODE, patchFlag: SharedPatchFlags.NONE, dynamicProps: [], el: null, anchor: null, parent: null, componentInstance: null, component: undefined, vnodeType: VNodeType.TEXT }];
    }
    return [child];
  });
}

/**
 * 计算 PatchFlags
 */
function computeFlags(type: VNodeType, props: VNodeProps, children: VNode['children']): number {
  let flags = SharedPatchFlags.NONE;
  
  // 静态元素
  if (type === VNodeType.ELEMENT && !props && (!children || typeof children === 'string')) {
    return SharedPatchFlags.NONE;
  }
  
  // 动态 props
  if (props && Object.keys(props).length > 0) {
    const hasEvent = Object.keys(props).some(k => k.startsWith('on'));
    const hasClass = 'class' in props;
    const hasStyle = 'style' in props;
    
    if (hasEvent) flags |= SharedPatchFlags.EVENTS;
    if (hasClass) flags |= SharedPatchFlags.CLASS;
    if (hasStyle) flags |= SharedPatchFlags.STYLE;
    if (!hasEvent && !hasClass && !hasStyle) flags |= SharedPatchFlags.PROPS;
  }
  
  // 动态 children
  if (children != null && typeof children !== 'string') {
    if (Array.isArray(children)) {
      const hasKeyed = children.some(c => c && typeof c === 'object' && 'key' in c && c.key != null);
      flags |= hasKeyed ? SharedPatchFlags.KEYED_FRAGMENT : SharedPatchFlags.UNKEYED_FRAGMENT;
    } else {
      flags |= SharedPatchFlags.TEXT;
    }
  }
  
  return flags || SharedPatchFlags.NONE;
}

// ============================================================================
// h() 主函数
// ============================================================================

/**
 * 创建 VNode
 * 
 * @param type 元素标签名、组件或 Fragment
 * @param props 属性对象
 * @param children 子节点
 * @returns VNode
 */
export function h(
  type: ComponentType,
  props?: NormalizedProps | null,
  ...children: VNodeChild[]
): VNode {
  // 处理无 props 只有 children 的情况
  let normalizedProps: VNodeProps;
  let normalizedChildren: VNode['children'];
  let key: string | number | null = null;
  let ref: VNode['ref'] = null;
  
  if (props != null && !Array.isArray(props) && typeof props === 'object' && !(props as any).__v_isVNode) {
    // 有 props 对象
    ({ key = null, ref = null, ...normalizedProps } = props);
    normalizedProps = normalizeProps(normalizedProps);
    normalizedChildren = normalizeChildren(children);
  } else {
    // 只有 children，无 props
    normalizedProps = {};
    normalizedChildren = normalizeChildren([props as VNodeChild, ...children]);
  }
  
  // 确定 VNode 类型
  let vnodeType: VNodeType;
  let component: VNode['component'] = undefined;
  
  if (typeof type === 'string') {
    vnodeType = VNodeType.ELEMENT;
  } else if (typeof type === 'function' || (type && typeof type === 'object')) {
    // 组件类型判断
    if ((type as any).__v_isFragment) {
      vnodeType = VNodeType.FRAGMENT;
    } else if ('__v_isComponent' in (type as any)) {
      vnodeType = VNodeType.COMPONENT;
      component = type as Component;
    } else if ('render' in (type as any)) {
      vnodeType = VNodeType.COMPONENT;
      component = type as Component;
    } else {
      vnodeType = VNodeType.COMPONENT;
      component = type as Component;
    }
  } else {
    vnodeType = VNodeType.TEXT;
  }
  
  // 计算 flags
  const patchFlag = computeFlags(vnodeType, normalizedProps, normalizedChildren);
  
  // 创建 VNode
  const vnode: VNode = {
    type,
    props: normalizedProps,
    children: normalizedChildren,
    key,
    ref,
    component,
    vnodeType,
    patchFlag,
    dynamicProps: patchFlag & SharedPatchFlags.PROPS 
      ? Object.keys(normalizedProps).filter(k => !['class', 'style'].includes(k))
      : [],
    el: null,
    anchor: null,
    parent: null,
    componentInstance: null,
    shapeFlag: getShapeFlag(vnodeType, normalizedChildren),
  };
  
  return vnode;
}

// ============================================================================
// VNode 形状标记 (运行时用，区别于编译时的 VNodeFlags)
// ============================================================================

const VNodeShapeFlags = {
  ELEMENT: 1,
  COMPONENT: 1 << 1,
  TEXT_NODE: 1 << 2,
  FRAGMENT: 1 << 3,
  TELEPORT: 1 << 4,
  SUSPENSE: 1 << 5,
  ARRAY_CHILDREN: 1 << 6,
  TEXT_CHILDREN: 1 << 7,
} as const;

/**
 * 获取 VNode 形状标记
 */
/**
 * 获取 VNode 完整形状标记（包含类型和 children 类型）
 */
function getShapeFlag(type: VNodeType, children?: VNode['children']): number {
  let flag = 0;
  
  switch (type) {
    case VNodeType.ELEMENT:
      flag = VNodeShapeFlags.ELEMENT;
      break;
    case VNodeType.COMPONENT:
      flag = VNodeShapeFlags.COMPONENT;
      break;
    case VNodeType.TEXT:
      flag = VNodeShapeFlags.TEXT_NODE;
      break;
    case VNodeType.FRAGMENT:
      flag = VNodeShapeFlags.FRAGMENT;
      break;
    case VNodeType.TELEPORT:
      flag = VNodeShapeFlags.TELEPORT;
      break;
    case VNodeType.SUSPENSE:
      flag = VNodeShapeFlags.SUSPENSE;
      break;
    default:
      flag = VNodeShapeFlags.ELEMENT;
  }
  
  // 添加 children 类型标记
  if (children != null) {
    if (Array.isArray(children)) {
      flag |= VNodeShapeFlags.ARRAY_CHILDREN;
    } else if (typeof children === 'string') {
      flag |= VNodeShapeFlags.TEXT_CHILDREN;
    }
  }
  
  return flag;
}

// ============================================================================
// Fragment / Text / Comment 创建函数
// ============================================================================

/**
 * 创建 Fragment VNode
 */
export function Fragment(props: NormalizedProps | null, ...children: VNodeChild[]): VNode {
  return h(Fragment, props, ...children);
}

// Fragment 函数本身标记为 Fragment 类型
(Fragment as any).__v_isFragment = true;

/**
 * 创建 Text VNode
 */
/**
 * 创建 Text VNode
 */
export function Text(text: string | number): VNode {
  return {
    type: Text,
    props: null,
    children: String(text),
    key: null,
    ref: null,
    shapeFlag: VNodeShapeFlags.TEXT_NODE,