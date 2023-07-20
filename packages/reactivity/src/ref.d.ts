/**
 * UpFault Reactivity - Ref Module
 *
 * Ref 实现：基于 Proxy + 依赖追踪的响应式引用
 */
import type { Ref } from '@upfault/shared';
/**
 * 创建 ref
 * @param value 初始值
 * @returns Ref 对象
 */
