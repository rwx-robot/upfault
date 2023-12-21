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