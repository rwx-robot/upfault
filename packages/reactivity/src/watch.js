/**
 * UpFault Reactivity - Watch Module
 *
 * Watch 实现：监听响应式数据变化
 */
import { createEffect, stopEffect, runEffectSync, getCurrentEffect, isRef, isFunction, isArray, hasChanged, } from './dep';