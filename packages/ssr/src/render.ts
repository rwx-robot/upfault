/**
 * UpFault SSR - 核心渲染功能
 * 
 * 将组件渲染为 HTML 字符串、Node 流或 Web Stream
 */

import { h, type VNode, type ComponentInstance } from '@upfault/runtime';
import { Priority, type SchedulerTask } from '@upfault/scheduler';
import { VNodeType } from '@upfault/shared';

export interface SSRContext {
  modules: Set<string>;
  styles: Set<string>;
  scripts: Set<string>;