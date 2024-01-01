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