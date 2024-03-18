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
    [Priority.IMMEDIATE]: 'Immediate',
    [Priority.USER_BLOCKING]: 'UserBlocking',
    [Priority.NORMAL]: 'Normal',
    [Priority.LOW]: 'Low',
    [Priority.IDLE]: 'Idle',
};
/**
 * 从过期时间推算优先级
 */
export function priorityFromExpirationTime(expirationTime) {
    const now = performance.now();
    const timeLeft = expirationTime - now;
    if (timeLeft <= 0)
        return Priority.IMMEDIATE;
    if (timeLeft <= 250)
        return Priority.USER_BLOCKING;
    if (timeLeft <= 5000)
        return Priority.NORMAL;
    if (timeLeft <= 10000)
        return Priority.LOW;
    return Priority.IDLE;
}
/**
 * 计算过期时间 (ms)
 */
export function computeExpirationTime(priority) {
    const now = performance.now();
    switch (priority) {
        case Priority.IMMEDIATE:
            return now; // 已过期，强制同步执行
        case Priority.USER_BLOCKING:
            return now + 250;
        case Priority.NORMAL:
            return now + 5000;
        case Priority.LOW:
            return now + 10000;
        case Priority.IDLE:
            return now + 0x7fffffff;
    }
}
/** 默认调度器配置 */
