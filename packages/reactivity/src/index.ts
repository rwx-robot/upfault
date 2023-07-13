/**
 * @upfault/reactivity - UpFault 细粒度响应式系统
 * 
 * 基于 Proxy + 依赖追踪的响应式系统
 * 参考 Vue 3 / SolidJS 设计
 * 版本: 0.2.0
 */

export {
  // Core
  track,
  trigger,
  createDep,
  createEffect,
  stopEffect,
  getCurrentEffect,
  pushEffect,
  popEffect,
} from './dep';

export {
  ref,
  shallowRef,
  readonlyRef,
  isRef,
  unref,
  toRef,
  toRefs,
} from './ref';

export {
  computed,
} from './computed';