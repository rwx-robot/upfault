/**
 * UpFault Reactivity - Watch Module
 * 
 * Watch 实现：监听响应式数据变化
 */

import { 
  track, 
  trigger, 
  createDep, 
  createEffect, 
  stopEffect, 