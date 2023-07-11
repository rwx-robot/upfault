/**
 * UpFault Reactivity - Dependency Tracking Core
 * 
 * 核心依赖追踪系统，基于 Vue 3 / SolidJS 设计
 * 支持 effect、ref、computed、watch 的依赖收集与触发
 */

import type { Dep, Effect, DebuggerEvent, TrackOpTypes, TriggerOpTypes, Ref } from '@upfault/shared';

/**
 * 当前正在执行的 effect 栈
 */
const effectStack: Effect[] = [];

/**
 * 获取当前活跃的 effect
 */
export function getCurrentEffect(): Effect | undefined {
  return effectStack[effectStack.length - 1];
}

/**
 * 推入 effect 到栈中
 */
export function pushEffect(effect: Effect): void {
  effectStack.push(effect);
}

/**
 * 弹出 effect 栈
 */
export function popEffect(): Effect | undefined {
  return effectStack.pop();
}

/**
 * 依赖收集：建立 effect 与 dep 的双向关联
 * @param dep 依赖对象
 * @param event 调试事件信息
 */
export function track(dep: Dep, event?: DebuggerEvent): void {
  const effect = getCurrentEffect();
  if (!effect) return;

  // 建立 effect -> dep 的依赖关系
  if (!effect.deps.includes(dep)) {
    effect.deps.push(dep);
  }

  // 建立 dep -> effect 的订阅关系
  if (!dep.subs.has(effect)) {
    dep.subs.add(effect);
    dep.version++;
  }

  // 调试钩子
  if (effect.onTrack && event) {
    effect.onTrack(event);
  }
}

/**
 * 依赖触发：通知所有订阅的 effect 重新执行
 * @param dep 依赖对象
 * @param event 调试事件信息
 */
export function trigger(dep: Dep, event?: DebuggerEvent): void {
  // 复制一份避免迭代过程中修改集合
  const effects = [...dep.subs];
  
  for (const effect of effects) {
    if (!effect.active) continue;
    
    // 避免递归触发
    if (!effect.allowRecurse && effectStack.includes(effect)) continue;

    // 调试钩子
    if (effect.onTrigger && event) {
      effect.onTrigger(event);
    }

    // 执行 effect - 使用 runEffectSync 管理 effect 栈
    if (effect.scheduler) {
      effect.scheduler(effect.fn);
    } else {
      runEffectSync(effect);
    }
  }
}

/**
 * 创建 Dep 对象
 */
export function createDep(name?: string): Dep {
  return {
    subs: new Set(),
    version: 0,
    name,
  };
}

/**
 * 创建 Effect 对象
 */
export function createEffect(fn: () => void, options?: {
  scheduler?: (fn: () => void) => void;
  onTrack?: (event: DebuggerEvent) => void;
  onTrigger?: (event: DebuggerEvent) => void;
  allowRecurse?: boolean;
  lazy?: boolean;
}): Effect {
  const effect: Effect = {
    fn,
    scheduler: options?.scheduler,
    deps: [],
    active: true,
    stopped: false,
    allowRecurse: options?.allowRecurse ?? false,
    lazy: options?.lazy ?? false,
    onTrack: options?.onTrack,
    onTrigger: options?.onTrigger,
  };
  return effect;
}

/**
 * 停止 effect
 */
export function stopEffect(effect: Effect): void {
  if (effect.stopped) return;
  
  effect.stopped = true;
  effect.active = false;
  
  // 从所有 dep 中移除
  for (const dep of effect.deps) {
    dep.subs.delete(effect);
  }
  effect.deps.length = 0;
}

/**
 * 暂停 effect
 */
export function pauseEffect(effect: Effect): void {
  effect.active = false;
}

/**
 * 恢复 effect
 */
export function resumeEffect(effect: Effect): void {
  effect.active = true;
}

/**
 * 批量执行函数，暂停依赖收集
 */
export function pauseTracking(): void {
  // 可以通过标记位实现，简化版直接返回
}

/**
 * 恢复依赖收集
 */
export function resetTracking(): void {
  // 简化版直接返回
}

/**
 * 判断是否为 Ref
 */
export function isRef<T>(val: any): val is Ref<T> {
  return val && val.__v_isRef === true;
}

/**
 * 解包 ref
 */
export function unref<T>(ref: T | Ref<T>): T extends Ref<infer U> ? U : T {
  return (isRef(ref) ? ref.value : ref) as any;
}

/**
 * 转换为 ref
 */
export function toRef<T>(object: any, key: string): Ref<any> {
  const dep = createDep();
  
  return {
    get value(): any {
      track(dep);
      return object[key];
    },
    set value(newValue: any) {
      object[key] = newValue;
      trigger(dep);
    },
    __v_isRef: true,
  } as Ref<any>;
}

/**
 * 转换对象所有属性为 ref
 */
export function toRefs<T extends object>(object: T): { [K in keyof T]: Ref<T[K]> } {
  const result: any = {};
  for (const key in object) {
    result[key] = toRef(object, key);
  }
  return result;
}

/**
 * 创建 shallow ref
 */
export function shallowRef<T>(value: T): Ref<T> {
  const dep = createDep();
  
  return {
    get value(): T {
      track(dep);
      return value;
    },
    set value(newValue: T) {
      if (value !== newValue) {
        value = newValue;
        trigger(dep);
      }
    },
    __v_isRef: true,
    __v_isShallow: true,
  } as Ref<T>;
}

/**
 * 创建 readonly ref
 */
export function readonlyRef<T>(value: T): Readonly<Ref<T>> {
  const dep = createDep();
  
  return {
    get value(): T {
      track(dep);
      return value;
    },
    set value(_: T) {
      console.warn('[UpFault] Ref is readonly');
    },
    __v_isRef: true,
    __v_isReadonly: true,
  } as Readonly<Ref<T>>;
}

/**
 * 判断是否为函数
 */
export function isFunction(val: any): val is Function {
  return typeof val === 'function';
}

/**
 * 判断是否为数组
 */
export function isArray(val: any): val is any[] {
  return Array.isArray(val);
}

/**
 * 判断值是否变化
 */
export function hasChanged(a: any, b: any): boolean {
  return a !== b && (a === a || b === b);
}

/**
 * 运行 effect
 */
export function runEffect(effect: Effect): void {
  if (!effect.active || effect.stopped) return;
  
  // 检查递归深度
  if (effectStack.length >= 100) {
    console.warn('[UpFault] Effect stack overflow, possible infinite loop');
    return;
  }
  
  pushEffect(effect);
  
  try {
    if (effect.scheduler) {