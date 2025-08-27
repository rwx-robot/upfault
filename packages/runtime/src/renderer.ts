/**
 * UpFault Runtime - DOM Renderer
 * 
 * 虚拟 DOM 到真实 DOM 的挂载、更新、卸载
 * 参考 Vue 3 renderer 设计
 */

import { 
  h, 
  Fragment, 
  Text, 
  Comment,
  type VNode,
  type VNodeProps,
  type NormalizedProps,
} from './h';

import { 
  aeroDiff, 
  DiffOpType, 
  type DiffOp, 
  type DiffResult,
  type Block 
} from '@upfault/diff';

import { 
  PatchFlags,
  type VNode as SharedVNode,
  type ComponentInstance,
  type Component,
} from '@upfault/shared';

// VNodeType constants (inline to avoid import issues)
const VNodeType = {
  TEXT: 1,
  ELEMENT: 2,
  COMPONENT: 3,
  BLOCK: 4,
  FRAGMENT: 5,
  COMMENT: 6,
  TELEPORT: 7,
  SUSPENSE: 8,
  KEEPALIVE: 9,
};

import type { RendererOptions } from './renderer-options';

// ref 判定用于组件上下文代理：读取时解包、写入时回写 .value（见 createComponentProxy）
import { isRef } from '@upfault/reactivity';

import {
  callBeforeMount,
  callMounted,
  callBeforeUpdate,
  callUpdated,
  callBeforeUnmount,
  callUnmounted,
  callActivated,
  callDeactivated,
  createRenderEffect,
  runRenderEffect,
  stopRenderEffect,
  handleError,
  pushInstance,
  popInstance,
  getCurrentInstance,
  setCurrentInstance,
  instanceStack,
} from './lifecycle';

// ============================================================================
// VNode 形状标记 (运行时用，与 h.ts 保持一致)
// ============================================================================

const VNodeShapeFlags = {
  ELEMENT: 1,
  COMPONENT: 1 << 1,
  TEXT_NODE: 1 << 2,
  FRAGMENT: 1 << 3,
  TELEPORT: 1 << 4,
  SUSPENSE: 1 << 5,
  ARRAY_CHILDREN: 1 << 6,
} as const;

// ============================================================================
// 渲染器选项接口
// ============================================================================

// RendererOptions 类型从 './renderer-options' 导入（见文件顶部 import type）

// ============================================================================
// 内部类型
// ============================================================================

interface RendererInternals<HostElement> {
  p: (n1: VNode | null, n2: VNode, parent: HostElement, anchor?: HostElement | null) => void;
  umount: (vnode: VNode, parent: HostElement | null) => void;
  m: (vnode: VNode, parent: HostElement, anchor?: HostElement | null) => void;
}

interface RendererWithHydrate<HostElement> extends RendererInternals<HostElement> {
  render: (vnode: VNode | null, container: HostElement) => void;
  hydrate: (vnode: VNode, container: HostElement) => void;
}

// ============================================================================
// 创建渲染器主函数
// ============================================================================

export function createRenderer<HostElement extends Node = Element>(
  options: RendererOptions<HostElement>
): RendererWithHydrate<HostElement> {
  const {
    createElement,
    createText,
    createComment,
    setElementText,
    setText,
    insert,
    remove,
    patchProp,
  } = options;
  
  // 使用 WeakMap 存储容器的根 VNode
  const containerVNodes = new WeakMap<HostElement, VNode | null>();
  
  function getContainerVNode(container: HostElement): VNode | null {
    return containerVNodes.get(container) ?? null;
  }
  
  function setContainerVNode(container: HostElement, vnode: VNode | null): void {
    containerVNodes.set(container, vnode);
  }
  
  // Node to HostElement 转换
  const toElement = options._nodeToElement || ((node: Node) => node as HostElement | null);

  // ========================================================================
  // 挂载
  // ========================================================================
  
  function mountElement(
    vnode: VNode,
    parent: HostElement,
    anchor: HostElement | null = null
  ): void {
    const { tag, props, children, patchFlag, ref } = vnode;
    const shapeFlag = vnode.shapeFlag ?? 0;

    // 创建 DOM 元素（tag 承载真实标签名，type 字段已由 VNodeType 枚举接管）
    const isSVG = tag === 'svg' || (vnode as any).isSVG;
    const el = createElement(tag as string, isSVG);
        
    // 关联 VNode 与 DOM
    vnode.el = el;
        
    // 挂载 props
    if (props) {
      for (const key in props) {
        if (key !== 'children' && key !== 'key' && key !== 'ref') {
          patchProp(el, key, null, props[key]);
        }
      }
    }

    // 挂载 children
    if (shapeFlag & VNodeShapeFlags.TEXT_NODE) {
      // 文本节点
            setElementText(el, children as string);
          } else if (shapeFlag & VNodeShapeFlags.ARRAY_CHILDREN) {
      // 数组子节点
      mountChildren(children as VNode[], el, null);
    } else if (shapeFlag & VNodeShapeFlags.COMPONENT) {
      // 组件 - 由 mountComponent 处理
    }
    
    // 插入 DOM
    insert(el, parent, anchor);
        
    // 处理 ref
    if (ref) {
      setRef(ref, el);
    }
  }
  
  function mountChildren(
    children: VNode[],
    parent: HostElement,
    anchor: HostElement | null
  ): void {
    for (const child of children) {
      if (child == null) continue;
      patch(null, child, parent, anchor);
    }
  }
  
  function mountText(vnode: VNode, parent: HostElement, anchor: HostElement | null = null): void {
    const el = createText(vnode.children as string);
    vnode.el = el;
    insert(el, parent, anchor);
  }
  
  function mountComment(vnode: VNode, parent: HostElement, anchor: HostElement | null = null): void {
    const el = createComment(vnode.children as string || '');
    vnode.el = el;
    insert(el, parent, anchor);
  }
  
  function mountFragment(
    vnode: VNode,
    parent: HostElement,
    anchor: HostElement | null
  ): void {
    mountChildren(vnode.children as VNode[], parent, anchor);
  }
  
  function mountComponent(
    vnode: VNode,
    parent: HostElement,
    anchor: HostElement | null
  ): void {
    const { tag, props, children, componentInstance } = vnode;
    const component = tag as Component;
    
    // 创建组件实例
    const instance: ComponentInstance = {
      uid: instanceStack.length + 1,
      type: component,
      props: props || {},
      state: {},
      render: () => vnode,
      update: () => {},
      unmount: () => {},
      isUnmounted: false,
      isMounted: false,
      subTree: null,
      subTreeAnchor: null,
      effects: [],
      root: null,
      parent: instanceStack[instanceStack.length - 1] || null,
    };
    
    // 关联实例
    vnode.componentInstance = instance;
    instance.root = instance.parent ? instance.parent.root : instance;
    
    // 设置当前实例
    pushInstance(instance);
    
    try {
      // 解析 props
      const resolvedProps = resolveProps(component!, props || {});
      instance.proxy = createComponentProxy(instance, resolvedProps);
      
      // 解析插槽
      const slots = resolveSlots(children);

      // 执行 setup()：组件状态的唯一来源。
      // 模板编译产物里的 `_ctx.count` 就是从这里解析出来的（见 createComponentProxy）。
      runSetup(instance, component!, resolvedProps, slots);

      // 获取 render 函数：setup 返回渲染函数时优先使用它
      const renderFn = instance.setupRender ?? getRenderFunction(component!);
      if (!renderFn) {
        throw new Error(`[UpFault] Component ${component!.name || 'Anonymous'} 没有 render 函数`);
      }
      
      instance.render = () => {
        setCurrentInstance(instance);
        return renderFn(instance.proxy, { slots });
      };
      
      // 创建渲染 effect：首次渲染即挂载子树，依赖变化后重渲染 diff + patch。
      // 渲染必须在依赖追踪上下文中执行（见 runRenderEffect），否则 effect
      // 收集不到 render 内读取的 ref，响应式更新永不触发。
      const effect = createRenderEffect(instance, () => {
        const nextTree = instance.render!();
        const prevTree = instance.subTree ?? null;
        instance.subTree = nextTree;
        if (nextTree) {
          patch(prevTree, nextTree, parent, anchor);
          vnode.el = nextTree.el;
        } else if (prevTree) {
          unmount(prevTree, parent);
        }
        return nextTree;
      });
      
      (instance.effects ??= []).push(effect);
      instance.update = () => runRenderEffect(effect);
      
      // 执行 beforeMount (同步)
      callBeforeMount(instance);
      
      // 首次渲染（effect 上下文中执行：建立依赖收集 + 挂载子树）
      runRenderEffect(effect);
      
      // 执行 mounted
      callMounted(instance);

      // 标记组件已完成挂载（供 getCurrentInstance().isMounted 等查询）
      instance.isMounted = true;
    } catch (err) {
      handleError(err as Error, instance, 'mountComponent');
    }
  }
  
  /**
   * 更新一个已挂载的组件：复用实例、刷新 props，再触发重渲染。
   * 组件 vnode 与元素 vnode 的复用语义不同，必须走这里而非 patchElement。
   */
  function updateComponent(n1: VNode, n2: VNode): void {
    const instance = n1.componentInstance;
    if (!instance) {
      // 没有实例（异常情况）→ 退化为元素级 patch
      patchElement(n1, n2);
      return;
    }
    n2.componentInstance = instance;
    n2.el = n1.el;

    // 刷新 props / proxy（render 每次读取 instance.proxy，故重建即可生效）
    const resolvedProps = resolveProps(instance.type, n2.props || {});
    instance.props = resolvedProps;
    instance.proxy = createComponentProxy(instance, resolvedProps);

    // 触发重渲染（经依赖追踪上下文执行）
    instance.update();
  }

  function resolveProps(comp: Component, props: VNodeProps): VNodeProps {
    // 简单实现：直接返回 props
    // TODO: 合并默认值、类型转换等
    return props;
  }
  
  /**
   * 执行组件 `setup()`。
   *
   * setup 返回的对象合并进 `instance.state`，成为模板 `_ctx.xxx` 的解析目标；
   * 返回函数时按 Vue 语义视为渲染函数（挂到 `instance.setupRender`）。
   *
   * 没有 setup 的组件（纯 `{ render }`）保持原行为不变。
   */
  function runSetup(
    instance: ComponentInstance,
    component: Component,
    props: VNodeProps,
    slots: Record<string, any>
  ): void {
    if (!component || typeof component !== 'object') return;
    const setup = (component as { setup?: unknown }).setup;
    if (typeof setup !== 'function') return;

    const context = {
      slots,
      attrs: {},
      emit: () => {},
      expose: () => {},
    };

    const result = (setup as (p: VNodeProps, c: any) => unknown).call(component, props, context);

    if (typeof result === 'function') {
      instance.setupRender = result as (proxy: any, ctx: any) => VNode | null;
      return;
    }
    if (result && typeof result === 'object') {
      Object.assign(instance.state, result);
    }
  }

  /**
   * 组件渲染上下文代理。
   *
   * 读取顺序：props → setup 状态（state）；ref 自动解包，因此模板里写
   * `{{ count }}` 而不是 `{{ count.value }}`。
   * 写入（v-model、事件处理函数里的赋值）会回写到对应 ref 的 `.value`，
   * 而不是把 ref 本身替换掉 —— 否则响应式链会断。
   *
   * 历史：此前 get 只查 props，其余一律返回 undefined，所以 setup() 返回的
   * 状态、方法、computed 全部读不到，编译产物里的 `_ctx.count` 恒为 undefined。
   */
  function createComponentProxy(instance: ComponentInstance, props: VNodeProps): any {
    const state = instance.state;
    return new Proxy(props, {
      get(target, key) {
        if (key in target) return (target as any)[key];
        if (typeof key === 'string' && key in state) {
          const value = (state as Record<string, unknown>)[key];
          return isRef(value) ? value.value : value;
        }
        return undefined;
      },
      set(target, key, value) {
        if (typeof key === 'string' && key in state) {
          const existing = (state as Record<string, unknown>)[key];
          if (isRef(existing)) {
            (existing as { value: unknown }).value = value;
          } else {
            (state as Record<string, unknown>)[key] = value;
          }
          return true;
        }
        (target as any)[key] = value;
        return true;
      },
      has(target, key) {
        return key in target || (typeof key === 'string' && key in state);
      },
    });
  }
  
  function resolveSlots(children: VNode['children']): Record<string, any> {
    if (!children) return {};
    if (Array.isArray(children)) {
      return { default: () => children };
    }
    if (typeof children === 'object' && 'default' in children) {
      return children as Record<string, any>;
    }
    return { default: () => [children] };
  }
  
  function getRenderFunction(comp: Component): ((proxy: any, ctx: any) => VNode | null) | null {
    if (typeof comp === 'function') {
      return comp as any;
    }
    if (comp && typeof comp === 'object' && typeof (comp as any).render === 'function') {
      return (comp as any).render;
    }
    // 注意：`setup` 本身**不是**渲染函数 —— 它的返回值是状态（或渲染函数，
    // 由 runSetup 挂到 instance.setupRender）。此前这里直接返回 setup，
    // 会把状态对象当成 VNode 渲染。
    return null;
  }
  
  // ========================================================================
  // 更新
  // ========================================================================
  
  function patch(
    n1: VNode | null,
    n2: VNode,
    parent: HostElement,
    anchor: HostElement | null = null
  ): void {
    // 类型相同（同标签/同组件），复用
    if (n1 && n1.tag === n2.tag && n1.key === n2.key) {
      if (n2.type === VNodeType.COMPONENT) {
        // 组件 vnode 不能走 patchElement：应复用实例、刷新 props 后重渲染
        updateComponent(n1, n2);
      } else {
        patchElement(n1, n2);
      }
      return;
    }
    
    // 类型不同，卸载旧的，挂载新的
    if (n1) {
      unmount(n1, parent);
    }
    
    // 挂载新节点
    mount(n2, parent, anchor);
  }
  
  function mount(vnode: VNode, parent: HostElement, anchor: HostElement | null = null): void {
    const { shapeFlag, vnodeType } = vnode;
    
    if (vnodeType === VNodeType.ELEMENT) {
      mountElement(vnode, parent, anchor);
    } else if (vnodeType === VNodeType.TEXT) {
      mountText(vnode, parent, anchor);
    } else if (vnodeType === VNodeType.COMMENT) {
      mountComment(vnode, parent, anchor);
    } else if (vnodeType === VNodeType.FRAGMENT) {
      mountFragment(vnode, parent, anchor);
    } else if (vnodeType === VNodeType.COMPONENT) {
      mountComponent(vnode, parent, anchor);
    }
  }
  
  function patchElement(n1: VNode, n2: VNode): void {
    const el = n1.el! as HostElement;
    n2.el = el;
    
    const oldProps = n1.props || {};
    const newProps = n2.props || {};
    
    // 更新 props
    patchProps(el, oldProps, newProps);
    
    // 更新 children
    patchChildren(n1, n2, el);
    
    // 更新 ref
    if (n2.ref !== n1.ref) {
      if (n1.ref) setRef(n1.ref, null);
      if (n2.ref) setRef(n2.ref, el);
    }
  }
  
  function patchProps(el: HostElement, oldProps: VNodeProps, newProps: VNodeProps): void {
    // 删除旧的
    for (const key in oldProps) {
      if (!(key in newProps)) {
        patchProp(el, key, oldProps[key], null);
      }
    }
    
    // 更新/新增
    for (const key in newProps) {
      if (oldProps[key] !== newProps[key]) {
        patchProp(el, key, oldProps[key], newProps[key]);
      }
    }
  }
  
  function patchChildren(n1: VNode, n2: VNode, parent: HostElement): void {
    const c1 = n1.children;
    const c2 = n2.children;
    const shapeFlag1 = n1.shapeFlag ?? 0;
    const shapeFlag2 = n2.shapeFlag ?? 0;
    
    // 文本节点
    if (shapeFlag2 & VNodeShapeFlags.TEXT_NODE) {
      if (shapeFlag1 & VNodeShapeFlags.ARRAY_CHILDREN) {
        // 旧是数组，新是文本
        unmountChildren(c1 as VNode[]);
      }
      if (c1 !== c2) {
        setElementText(parent, c2 as string);
      }
      return;
    }
    
    // 新是数组
    if (shapeFlag2 & VNodeShapeFlags.ARRAY_CHILDREN) {
      if (shapeFlag1 & VNodeShapeFlags.ARRAY_CHILDREN) {
        // 旧也是数组，使用 Diff 算法
        patchKeyedChildren(c1 as VNode[], c2 as VNode[], parent);
      } else {
        // 旧是文本或空
        if (shapeFlag1 & VNodeShapeFlags.TEXT_NODE) {
          setElementText(parent, '');
        }
        mountChildren(c2 as VNode[], parent, null);
      }
      return;
    }
    
    // 新是空或 Fragment
    if (shapeFlag1 & VNodeShapeFlags.ARRAY_CHILDREN) {
      unmountChildren(c1 as VNode[]);
    } else if (shapeFlag1 & VNodeShapeFlags.TEXT_NODE) {
      setElementText(parent, '');
    }
  }
  
  function patchKeyedChildren(c1: VNode[], c2: VNode[], parent: HostElement): void {
    const diffResult = aeroDiff(c1, c2, {
      enableTypeFallback: true,
      enableShapeMatching: true,
      maxDepth: 100,
      collectStats: true,
    });
    
    for (const op of diffResult.ops) {
      switch (op.type) {
        case DiffOpType.CREATE:
          if (op.newNode) {
            const anchor = op.toIndex !== undefined ? getAnchor(parent, op.toIndex) : null;
            mount(op.newNode, parent, anchor);
          }
          break;
        case DiffOpType.UPDATE:
          if (op.oldNode && op.newNode) {
            patch(op.oldNode, op.newNode, parent);
          }
          break;
        case DiffOpType.MOVE:
          if (op.oldNode && op.newNode) {
            patch(op.oldNode, op.newNode, parent);
            if (op.oldNode.el) {
              insert(op.oldNode.el, parent, getAnchor(parent, op.toIndex ?? 0));
            }
          }
          break;
        case DiffOpType.REMOVE:
          if (op.oldNode) {
            unmount(op.oldNode, parent);
          }
          break;
        case DiffOpType.REPLACE:
          if (op.oldNode && op.newNode) {
            unmount(op.oldNode, parent);
            const anchor = op.toIndex !== undefined ? getAnchor(parent, op.toIndex) : null;
            mount(op.newNode, parent, anchor);
          }
          break;
      }
    }
  }

  /**
   * 取 `parent` 自身第 index 个子节点，作为 insert 的锚点。
   *
   * 历史 Bug（2026-09-23 M5 基准发现）：旧实现先 `parentNode(parent)` 再取
   * `firstChild`，实际遍历的是 **parent 的父节点** 的子节点，返回的根本不是
   * parent 的孩子 —— `insertBefore(child, parent, 锚点)` 于是抛
   * `NotFoundError: The child can not be found in the parent`，
   * 导致 keyed 列表移动/中插时整条更新链中断（DOM 停在旧状态）。
   *
   * 索引越界（含纯追加场景）返回 null，由 insert 追加到末尾。
   */
  function getAnchor(parent: HostElement, index: number): HostElement | null {
    if (index < 0) return null;
    let child: Node | null = (parent as unknown as Node).firstChild;
    for (let i = 0; i < index && child; i++) {
      child = child.nextSibling;
    }
    return (child as unknown as HostElement) ?? null;
  }
  
  // ========================================================================
  // 卸载
  // ========================================================================
  
  function unmount(vnode: VNode, parent: HostElement | null = null): void {
    const { shapeFlag = 0, vnodeType, el, componentInstance } = vnode;
    
    // 组件卸载
    if (vnodeType === VNodeType.COMPONENT && componentInstance) {
      unmountComponent(componentInstance, parent);
      return;
    }
    
    // 卸载 children
    if (shapeFlag & VNodeShapeFlags.ARRAY_CHILDREN) {
      unmountChildren(vnode.children as VNode[]);
    }
    
    // 卸载 ref
    if (vnode.ref) {
      setRef(vnode.ref, null);
    }
    
    // 移除 DOM
    if (el && parent) {
      remove(el);
    }
  }
  
  function unmountChildren(children: VNode[]): void {
    for (const child of children) {
      if (child) unmount(child);
    }
  }
  
  function unmountComponent(instance: ComponentInstance, parent: HostElement | null = null): void {
    if (instance.isUnmounted) return;
    
    instance.isUnmounted = true;
    
    // 执行 beforeUnmount
    callBeforeUnmount(instance);
    
    // 卸载子树（必须带 parent，否则 unmount 不执行 DOM 移除）
    if (instance.subTree) {
      unmount(instance.subTree, parent);
    }
    
    // 执行 unmounted
    callUnmounted(instance);
    
    // 清理 effect
    if (instance.effects) {
      for (const effect of instance.effects) {
        stopRenderEffect(effect);
      }
      instance.effects.length = 0;
    }
  }
  
  // ========================================================================
  // Ref 处理
  // ========================================================================
  
  function setRef(ref: any, value: any): void {
    if (!ref) return;
    
    if (typeof ref === 'function') {
      ref(value);
    } else if (ref && typeof ref === 'object' && '__v_isRef' in ref) {
      (ref as any).value = value;
    }
  }
  
  // ========================================================================
  // 公开 API
  // ========================================================================
  
  function render(vnode: VNode | null, container: HostElement): void {
    if (vnode === null) {
      // 卸载容器内所有内容
      const prevVNode = getContainerVNode(container);
      if (prevVNode) {
        unmount(prevVNode, container);
        setContainerVNode(container, null);
      }
      return;
    }
    
    // 挂载或更新
    const prevVNode = getContainerVNode(container);
    patch(prevVNode, vnode, container);
    setContainerVNode(container, vnode);
  }
  
  function hydrate(vnode: VNode, container: HostElement): void {
    // TODO: 实现水合
    render(vnode, container);
  }
  
  return {
    render,
    hydrate,
    m: mount,
    p: patch,
    umount: unmount,
  };
}

// ============================================================================
// 默认 DOM 渲染器
// ============================================================================

export const defaultRendererOptions: RendererOptions = {
  createElement: (tag: string, isSVG?: boolean) => {
    return isSVG 
      ? document.createElementNS('http://www.w3.org/2000/svg', tag)
      : document.createElement(tag);
  },
  createText: (text: string) => document.createTextNode(text),
  createComment: (text: string) => document.createComment(text),
  setElementText: (el: Element, text: string) => {
    el.textContent = text;
  },
  setText: (node: Text, text: string) => {
    node.nodeValue = text;
  },
  insert: (child: Node, parent: Element, anchor?: Element | null) => {
    try {
      parent.insertBefore(child, anchor || null);
    } catch (e) {
      throw e;
    }
  },
  remove: (child: Node) => {
    child.parentNode?.removeChild(child);
  },
  patchProp: (el: Element, key: string, prevValue: any, nextValue: any) => {
    if (/^on[A-Z]/.test(key)) {
      // 事件监听器：约定 `on` + 首字母大写（onClick / onInput），
      // 与编译器产物一致。此前用 key.startsWith('on') 会把 `once` 这类
      // 普通属性误判成事件 'ce'。
      const event = key.slice(2).toLowerCase();
      if (prevValue) {
        el.removeEventListener(event, prevValue);
      }
      if (nextValue) {
        el.addEventListener(event, nextValue);
      }
    } else if (key === 'class') {
      el.className = nextValue || '';
    } else if (key === 'style') {
      const style = (el as HTMLElement).style;
      if (typeof nextValue === 'string') {
        style.cssText = nextValue;
      } else if (nextValue && typeof nextValue === 'object') {
        Object.assign(style, nextValue);
      } else {
        style.cssText = '';
      }
    } else if (key in el) {
      // DOM property
      (el as any)[key] = nextValue;
    } else {
      // Attribute
      if (nextValue == null || nextValue === false) {
        el.removeAttribute(key);
      } else {
        el.setAttribute(key, nextValue);
      }
    }
  },
  parentNode: (node: Element) => node.parentNode as Element,
  nextSibling: (node: Element) => node.nextElementSibling,
  _nodeToElement: (node: Node) => node as Element | null,
};

