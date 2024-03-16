/**
 * UpFault Scheduler Types - 优先级调度器核心类型
 *
 * 基于 React Fiber + Vue 3 调度思想，针对 Block 级粒度优化
 * 支持时间分片、优先级抢占、依赖感知调度
 */
export var Priority;
(function (Priority) {
    /** 同步立即执行 - 用户输入、动画帧 */
    Priority[Priority["IMMEDIATE"] = 0] = "IMMEDIATE";
    /** 用户阻塞级 - 拖拽、滚动、交互反馈 (250ms 内) */
    Priority[Priority["USER_BLOCKING"] = 250] = "USER_BLOCKING";
    /** 正常优先级 - 默认渲染、数据更新 (5s 内) */
    Priority[Priority["NORMAL"] = 5000] = "NORMAL";
    /** 低优先级 - 非可视区域、预取数据 (10s 内) */
    Priority[Priority["LOW"] = 10000] = "LOW";
    /** 空闲优先级 - 后台计算、GC、预编译 (无截止时间) */
    Priority[Priority["IDLE"] = 2147483647] = "IDLE";
})(Priority || (Priority = {}));
/**
 * 优先级人类可读名称
 */
export const PriorityNames = {