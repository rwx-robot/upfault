/**
 * UpFault VNode Flags - 编译时静态分析标记
 *
 * 位掩码设计，支持组合判断
 * 每个标志位对应编译时可确定的节点特性
 * 运行时可快速通过位运算判断节点类型
 */
export var VNodeFlags;
(function (VNodeFlags) {
    /** 纯静态文本节点，永远不更新 */
    VNodeFlags[VNodeFlags["STATIC_TEXT"] = 1] = "STATIC_TEXT";
    /** 纯静态元素节点，无动态绑定，无事件，无插槽 */
    VNodeFlags[VNodeFlags["STATIC_ELEMENT"] = 2] = "STATIC_ELEMENT";
    /** Key 在编译时已确定不变 */
    VNodeFlags[VNodeFlags["STATIC_KEY"] = 4] = "STATIC_KEY";
    /** 仅包含单一动态值 (如 {{ count }}) */
    VNodeFlags[VNodeFlags["PURE_DYNAMIC"] = 8] = "PURE_DYNAMIC";
    /** 包含多个动态值或复杂表达式 */
    VNodeFlags[VNodeFlags["MULTI_DYNAMIC"] = 16] = "MULTI_DYNAMIC";
    /** 存在事件监听器 (@click, @input 等) */
    VNodeFlags[VNodeFlags["HAS_EVENT"] = 32] = "HAS_EVENT";
    /** 存在插槽 (<slot />) */
    VNodeFlags[VNodeFlags["HAS_SLOT"] = 64] = "HAS_SLOT";
    /** 运行时标记：高频更新节点 (由预测层动态设置) */
    VNodeFlags[VNodeFlags["FREQUENT_UPDATE"] = 128] = "FREQUENT_UPDATE";
    /** 组合标志：静态节点 (文本 + 元素) */
    VNodeFlags[VNodeFlags["STATIC"] = 3] = "STATIC";
    /** 组合标志：动态节点 (单一 + 多重) */
    VNodeFlags[VNodeFlags["DYNAMIC"] = 24] = "DYNAMIC";
    /** 组合标志：交互节点 (事件 + 插槽) */
    VNodeFlags[VNodeFlags["INTERACTIVE"] = 96] = "INTERACTIVE";
    /** 组合标志：可跳过 Diff 的节点 (静态 + 纯动态且无交互) */
    VNodeFlags[VNodeFlags["SKIPPABLE"] = 11] = "SKIPPABLE";
    /** 组合标志：必须 Diff 的节点 */
    VNodeFlags[VNodeFlags["MUST_DIFF"] = 244] = "MUST_DIFF";
})(VNodeFlags || (VNodeFlags = {}));
/**
 * 判断是否为静态节点
 */
export function isStaticNode(flags) {
    return (flags & VNodeFlags.STATIC) !== 0;
}
/**
 * 判断是否为纯动态节点 (单一值)
 */
export function isPureDynamic(flags) {
    return (flags & VNodeFlags.PURE_DYNAMIC) !== 0;
}
/**
 * 判断是否有交互 (事件或插槽)
 */
export function isInteractive(flags) {
    return (flags & VNodeFlags.INTERACTIVE) !== 0;
}
/**
 * 判断是否可跳过 Diff
 * 静态节点始终可跳过
 * 纯动态节点仅在无交互(事件/插槽)时可跳过
 */
export function isSkippable(flags) {
    // 静态节点始终可跳过
    if ((flags & VNodeFlags.STATIC) !== 0) {
        return true;
    }
    // 纯动态且无交互可跳过
    if ((flags & VNodeFlags.PURE_DYNAMIC) !== 0) {
        return (flags & VNodeFlags.INTERACTIVE) === 0;
    }
    return false;
}
/**
 * 判断是否为高频更新节点 (运行时标记)
 */
export function isFrequentUpdate(flags) {
    return (flags & VNodeFlags.FREQUENT_UPDATE) !== 0;
}
/**
 * 标记为高频更新
 */
export function markFrequentUpdate(flags) {
    return flags | VNodeFlags.FREQUENT_UPDATE;
}
/**
 * 移除高频更新标记
 */
export function unmarkFrequentUpdate(flags) {
    return flags & ~VNodeFlags.FREQUENT_UPDATE;
}
/**
 * Flags 可读性描述 (用于调试/DevTools)
 */
export function describeFlags(flags) {
    const parts = [];
    if (flags & VNodeFlags.STATIC_TEXT)
        parts.push('STATIC_TEXT');
    if (flags & VNodeFlags.STATIC_ELEMENT)
        parts.push('STATIC_ELEMENT');
    if (flags & VNodeFlags.STATIC_KEY)
        parts.push('STATIC_KEY');
    if (flags & VNodeFlags.PURE_DYNAMIC)
        parts.push('PURE_DYNAMIC');
    if (flags & VNodeFlags.MULTI_DYNAMIC)
        parts.push('MULTI_DYNAMIC');
    if (flags & VNodeFlags.HAS_EVENT)
        parts.push('HAS_EVENT');
    if (flags & VNodeFlags.HAS_SLOT)
        parts.push('HAS_SLOT');
    if (flags & VNodeFlags.FREQUENT_UPDATE)