/**
 * UpFault Scheduler - Work Loop (时间分片工作循环)
 * 
 * 核心调度逻辑：
 * 1. shouldYield() - 判断是否应让出主线程