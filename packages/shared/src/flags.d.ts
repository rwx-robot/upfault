/**
 * UpFault VNode Flags - 编译时静态分析标记
 *
 * 位掩码设计，支持组合判断
 * 每个标志位对应编译时可确定的节点特性
 * 运行时可快速通过位运算判断节点类型
 */
export declare const enum VNodeFlags {
    /** 纯静态文本节点，永远不更新 */
    STATIC_TEXT = 1,// 1
    /** 纯静态元素节点，无动态绑定，无事件，无插槽 */
    STATIC_ELEMENT = 2,// 2
    /** Key 在编译时已确定不变 */
    STATIC_KEY = 4,// 4
    /** 仅包含单一动态值 (如 {{ count }}) */
    PURE_DYNAMIC = 8,// 8
    /** 包含多个动态值或复杂表达式 */
    MULTI_DYNAMIC = 16,// 16
    /** 存在事件监听器 (@click, @input 等) */
    HAS_EVENT = 32,// 32
    /** 存在插槽 (<slot />) */
    HAS_SLOT = 64,// 64
    /** 运行时标记：高频更新节点 (由预测层动态设置) */
    FREQUENT_UPDATE = 128,// 128
    /** 组合标志：静态节点 (文本 + 元素) */
    STATIC = 3,// 3
    /** 组合标志：动态节点 (单一 + 多重) */
    DYNAMIC = 24,// 24
    /** 组合标志：交互节点 (事件 + 插槽) */
    INTERACTIVE = 96,// 96
    /** 组合标志：可跳过 Diff 的节点 (静态 + 纯动态且无交互) */
    SKIPPABLE = 11,// 11
    /** 组合标志：必须 Diff 的节点 */
    MUST_DIFF = 244
}
/**
 * 判断是否为静态节点
 */
export declare function isStaticNode(flags: number): boolean;
/**
 * 判断是否为纯动态节点 (单一值)
 */
export declare function isPureDynamic(flags: number): boolean;
/**
 * 判断是否有交互 (事件或插槽)
 */
export declare function isInteractive(flags: number): boolean;
/**
 * 判断是否可跳过 Diff
 * 静态节点始终可跳过
 * 纯动态节点仅在无交互(事件/插槽)时可跳过
 */
export declare function isSkippable(flags: number): boolean;
/**
 * 判断是否为高频更新节点 (运行时标记)
 */
export declare function isFrequentUpdate(flags: number): boolean;