/**
 * UpFault Reactivity - Effect System
 *
 * 副作用管理：effect、watchEffect、watch、computed 的基础实现
 */
import { createEffect, stopEffect, track, trigger, createDep, runEffect, runEffectSync, hasChanged, } from './dep';
/**
 * Effect 栈深度限制
 */
const MAX_EFFECT_STACK_DEPTH = 100;