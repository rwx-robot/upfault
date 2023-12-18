/**
 * UpFault Diff Types - AeroDiff 核心算法类型
 *
 * 双端扩散 + 类型位掩码 + Block 树
 * O(n) 线性时间复杂度
 */
import type { UpdateFingerprint } from './predict';
import type { Priority } from './scheduler';
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
}
/** VNode 类型 */
export type VNodeType = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
export declare namespace VNodeType {
    const TEXT = 1;
    const ELEMENT = 2;
    const COMPONENT = 3;
    const BLOCK = 4;
    const FRAGMENT = 5;
    const COMMENT = 6;
    const TELEPORT = 7;
    const SUSPENSE = 8;
    const KEEPALIVE = 9;
}
/** Props 类型 */
export interface VNodeProps {
    [key: string]: unknown;
    key?: string | number;
    ref?: Ref<unknown> | ((el: Element | null) => void);
    onClick?: (e: Event) => void;
    onInput?: (e: Event) => void;
    style?: string | Record<string, string | number>;
    class?: string | string[] | Record<string, boolean>;
}
/** Patch 标记 (运行时优化) */
export declare const enum PatchFlags {
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
    BAIL = -2
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