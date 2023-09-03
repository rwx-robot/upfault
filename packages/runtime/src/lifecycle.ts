/**
 * UpFault Runtime - 组件生命周期钩子
 * 
 * 生命周期管理，参考 Vue 3 设计
 */

import { effect, watchEffect, stopEffect } from '@upfault/reactivity';
import type { ComponentInstance, VNode } from '@upfault/shared/diff';