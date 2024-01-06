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
