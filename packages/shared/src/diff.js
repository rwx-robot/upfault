/**
 * UpFault Diff Types - AeroDiff 核心算法类型
 *
 * 双端扩散 + 类型位掩码 + Block 树
 * O(n) 线性时间复杂度
 */
// For backwards compatibility, provide a namespace with the values
export var VNodeType;
(function (VNodeType) {
    VNodeType.TEXT = 1;
    VNodeType.ELEMENT = 2;
    VNodeType.COMPONENT = 3;
    VNodeType.BLOCK = 4;
    VNodeType.FRAGMENT = 5;
    VNodeType.COMMENT = 6;
    VNodeType.TELEPORT = 7;
    VNodeType.SUSPENSE = 8;
    VNodeType.KEEPALIVE = 9;
})(VNodeType || (VNodeType = {}));
/** Patch 标记 (运行时优化) */
export var PatchFlags;
(function (PatchFlags) {
    /** 无需 patch */
    PatchFlags[PatchFlags["NONE"] = 0] = "NONE";
    /** 文本内容变化 */
    PatchFlags[PatchFlags["TEXT"] = 1] = "TEXT";
    /** class 变化 */
    PatchFlags[PatchFlags["CLASS"] = 2] = "CLASS";
    /** style 变化 */
    PatchFlags[PatchFlags["STYLE"] = 4] = "STYLE";
    /** Props 变化 */
    PatchFlags[PatchFlags["PROPS"] = 8] = "PROPS";
    /** 完整 Props 替换 */
    PatchFlags[PatchFlags["FULL_PROPS"] = 16] = "FULL_PROPS";
    /** 事件监听器变化 */
    PatchFlags[PatchFlags["EVENTS"] = 32] = "EVENTS";
    /** Keyed Fragment 重排 */
    PatchFlags[PatchFlags["KEYED_FRAGMENT"] = 64] = "KEYED_FRAGMENT";
    /** Unkeyed Fragment */
    PatchFlags[PatchFlags["UNKEYED_FRAGMENT"] = 128] = "UNKEYED_FRAGMENT";
    /** 动态插槽 */
    PatchFlags[PatchFlags["DYNAMIC_SLOTS"] = 256] = "DYNAMIC_SLOTS";
    /** 组件需要更新 */
    PatchFlags[PatchFlags["COMPONENT"] = 512] = "COMPONENT";
    /** 需要完整 Diff */
    PatchFlags[PatchFlags["FULL_DIFF"] = 1024] = "FULL_DIFF";
    /** 静态提升 */
    PatchFlags[PatchFlags["HOISTED"] = -1] = "HOISTED";
    /** Bailout (跳过) */
    PatchFlags[PatchFlags["BAIL"] = -2] = "BAIL";
})(PatchFlags || (PatchFlags = {}));
/** Diff 操作类型 */
export var DiffOpType;
(function (DiffOpType) {
    /** 创建新节点 */
    DiffOpType["CREATE"] = "CREATE";
    /** 更新现有节点 */
    DiffOpType["UPDATE"] = "UPDATE";
    /** 移动节点 */
    DiffOpType["MOVE"] = "MOVE";
    /** 删除节点 */
    DiffOpType["REMOVE"] = "REMOVE";
    /** 替换节点 (类型不同) */
    DiffOpType["REPLACE"] = "REPLACE";
})(DiffOpType || (DiffOpType = {}));
/** 默认 AeroDiff 配置 */
export const DEFAULT_AERODIFF_OPTIONS = {
    enableTypeFallback: true,
    enableShapeMatching: true,
    maxDepth: 100,
    collectStats: true,
};
//# sourceMappingURL=diff.js.map