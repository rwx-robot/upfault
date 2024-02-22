/**
 * UpFault Reactivity Types - 细粒度响应式系统核心类型
 *
 * 基于 Proxy + 依赖追踪，参考 Vue 3 / SolidJS 设计
 * 支持 ref, computed, effect, watch, batch 等核心 API
 */
/** 依赖追踪操作类型 */
export var TrackOpTypes;
(function (TrackOpTypes) {
    TrackOpTypes["GET"] = "get";
    TrackOpTypes["HAS"] = "has";
    TrackOpTypes["ITERATE"] = "iterate";
})(TrackOpTypes || (TrackOpTypes = {}));
/** 触发操作类型 */
export var TriggerOpTypes;
(function (TriggerOpTypes) {
    TriggerOpTypes["SET"] = "set";
    TriggerOpTypes["ADD"] = "add";
    TriggerOpTypes["DELETE"] = "delete";
    TriggerOpTypes["CLEAR"] = "clear";
})(TriggerOpTypes || (TriggerOpTypes = {}));
/** 默认响应式配置 */