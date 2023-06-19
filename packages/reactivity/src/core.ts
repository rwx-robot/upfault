/**
 * UpFault Reactivity - Effect System
 * 
 * 副作用管理：effect、watchEffect、watch、computed 的基础实现
 */

import { 
  createEffect, 
  stopEffect, 
  pauseEffect, 
  resumeEffect,
  getCurrentEffect,
  pushEffect,
  popEffect,
  track,
  trigger,
  createDep,
  runEffect,
  runEffectSync,
  isRef,
  isFunction,
  isArray,
  hasChanged,
  unref,
  toRef,
  toRefs,