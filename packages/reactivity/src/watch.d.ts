/**
 * UpFault Reactivity - Watch Module
 *
 * Watch 实现：监听响应式数据变化
 */
import type { WatchOptions, WatchCallback, WatchSource, WatchStopHandle } from '@upfault/shared';
/**
 * 创建 watch
 */
export declare function watch<T>(source: WatchSource<T>, callback: WatchCallback<T>, options?: WatchOptions): WatchStopHandle;
/**
 * 创建 watchEffect
 */