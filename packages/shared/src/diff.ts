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
  [key: string]: unknown;
  key?: string | number;
  ref?: Ref<unknown> | ((el: Element | null) => void);
  onClick?: (e: Event) => void;
  onInput?: (e: Event) => void;
  // ... 其他事件
  style?: string | Record<string, string | number>;
  class?: string | string[] | Record<string, boolean>;
}

/** Patch 标记 (运行时优化) */
export const enum PatchFlags {
  /** 无需 patch */
  NONE = 0,
  /** 文本内容变化 */
  TEXT = 1,
  /** class 变化 */
  CLASS = 2,
  /** style 变化 */
  STYLE = 4,
  /** Props 变化 */
  PROPS = 8,
  /** 完整 Props 替换 */
  FULL_PROPS = 16,
  /** 事件监听器变化 */
  EVENTS = 32,
  /** Keyed Fragment 重排 */
  KEYED_FRAGMENT = 64,
  /** Unkeyed Fragment */
  UNKEYED_FRAGMENT = 128,
  /** 动态插槽 */
  DYNAMIC_SLOTS = 256,
  /** 组件需要更新 */
  COMPONENT = 512,
  /** 需要完整 Diff */
  FULL_DIFF = 1024,
  /** 静态提升 */
  HOISTED = -1,
  /** Bailout (跳过) */
  BAIL = -2,
}

/** Block 结构 */
export interface Block {
  /** Block ID */
  id: string;
  
  /** 根节点 */
  root: VNode;
  
  /** 动态节点列表 (编译时确定) */
  dynamicNodes: VNode[];
  
  /** 优先级 */
  priority: Priority;
  
  /** 是否已挂载 */
  mounted: boolean;
  
  /** 更新计数 */
  updateCount: number;
}

/** Diff 操作类型 */
export const enum DiffOpType {
  /** 创建新节点 */
  CREATE = 'CREATE',
  /** 更新现有节点 */
  UPDATE = 'UPDATE',
  /** 移动节点 */
  MOVE = 'MOVE',
  /** 删除节点 */
  REMOVE = 'REMOVE',
  /** 替换节点 (类型不同) */
  REPLACE = 'REPLACE',
}

/** Diff 操作 */
export interface DiffOp {
  type: DiffOpType;
  oldNode?: VNode;
  newNode?: VNode;
  fromIndex?: number;
  toIndex?: number;
  parentNode?: VNode;
}

/** Diff 结果 */
export interface DiffResult {
  /** 操作序列 */
  ops: DiffOp[];
  
  /** 是否有变化 */
  changed: boolean;
  
  /** 统计信息 */
  stats: DiffStats;
}

/** Diff 统计 */
export interface DiffStats {
  /** 旧节点总数 */
  oldCount: number;
  
  /** 新节点总数 */
  newCount: number;
  
  /** 复用节点数 */
  reusedCount: number;
  
  /** 创建节点数 */
  createdCount: number;
  
  /** 删除节点数 */
  deletedCount: number;
  
  /** 移动节点数 */
  movedCount: number;
  
  /** 耗时 (ms) */
  duration: number;
}

/** 双端扩散索引 */
export interface DiffIndex {
  /** Key -> 旧节点索引映射 */
  keyMap: Map<string | number, number>;
  
  /** Type -> 旧节点索引列表映射 */
  typeMap: Map<VNodeType, number[]>;
  
  /** 旧节点数组 */
  oldNodes: VNode[];
  
  /** 处理范围 [start, end] */
  start: number;
  end: number;
}

/** AeroDiff 配置 */
export interface AeroDiffOptions {
  /** 是否启用类型兜底匹配 (key 找不到时按 type 匹配) */
  enableTypeFallback: boolean;
  
  /** 是否启用形状匹配 (children 结构相似) */
  enableShapeMatching: boolean;
  
  /** 最大递归深度 */
  maxDepth: number;
  
  /** 是否收集统计 */
  collectStats: boolean;
}

/** 默认 AeroDiff 配置 */
export const DEFAULT_AERODIFF_OPTIONS: AeroDiffOptions = {
  enableTypeFallback: true,
  enableShapeMatching: true,
  maxDepth: 100,
  collectStats: true,
};

/** 组件类型前向声明 */
export interface Component {
  (props: VNodeProps): VNode;
  displayName?: string;
  __hmrId?: string;