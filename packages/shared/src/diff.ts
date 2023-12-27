/**
 * UpFault Diff Types - AeroDiff 核心算法类型
 * 
 * 双端扩散 + 类型位掩码 + Block 树
 * O(n) 线性时间复杂度
 */

import type { UpdateFingerprint } from './predict';
import type { Priority } from './scheduler';

/** VNode 类型 */
export const VNodeType = {
  TEXT: 1,
  ELEMENT: 2,
  COMPONENT: 3,
  BLOCK: 4,
  FRAGMENT: 5,
  COMMENT: 6,
  TELEPORT: 7,
  SUSPENSE: 8,
  KEEPALIVE: 9,
} as const;

// Also export individual values for better tree-shaking and inlining
export const VNodeType_TEXT = 1;
export const VNodeType_ELEMENT = 2;
export const VNodeType_COMPONENT = 3;
export const VNodeType_BLOCK = 4;
export const VNodeType_FRAGMENT = 5;
export const VNodeType_COMMENT = 6;
export const VNodeType_TELEPORT = 7;
export const VNodeType_SUSPENSE = 8;
export const VNodeType_KEEPALIVE = 9;

// Type for VNodeType values
// VNodeType 同时作为值与类型使用：值为常量对象，类型为 1|2|...|9 的联合
export type VNodeType = typeof VNodeType[keyof typeof VNodeType];

/** @deprecated 保留别名，等价于 VNodeType */
export type VNodeTypeValue = VNodeType;

export interface VNode {
  /** 节点类型 */
  type: VNodeType;
  
  /** 标签名 (元素) / 组件构造函数 */
  tag: string | Component;
  
  /** Props 属性 */
  props: VNodeProps | null;
  
  /** 子节点 */
  children: VNode[] | string | null;
  
  /** Key */
  key: string | number | null;
  
  /** 编译时 Flags */
  flags: number;
  
  /** 运行时指纹 (预测层用) */
  fingerprint?: UpdateFingerprint;
  
  /** 对应的真实 DOM 节点 */
  el: Node | null;
  
  /** 父节点 */
  parent: VNode | null;
  
  /** 组件实例 (如果是组件) */
  component: ComponentInstance | null;
  
  /** Block 归属 */
  block: Block | null;
  
  /** Patch 标记 */
  patchFlag: PatchFlags;
  
  /** 动态 Props 索引 */
  dynamicProps: string[] | null;
  
  // ========== 运行时专用字段 ==========
  
  /** VNode 类型标识 (运行时) */
  vnodeType?: VNodeType;
  
  /** 形状标记 (运行时优化用) */
  shapeFlag?: number;
  
  /** Ref 引用 */
  ref?: any;
  
  /** 锚点节点 (用于 Fragment) */
  anchor?: Node | null;
  
  /** 组件实例内部引用 (旧版兼容) */
  componentInstance?: ComponentInstance | null;
}

/** Props 类型 */
export interface VNodeProps {