// upfault/packages/runtime/src/h.ts
import { VNodeType, PatchFlags as SharedPatchFlags } from "@upfault/shared/diff";
import { VNodeType as VNodeType2 } from "@upfault/shared/diff";
function normalizeClass(value) {
  if (value == null)
    return void 0;
  if (typeof value === "string")
    return value;
  if (Array.isArray(value)) {
    return value.filter((v) => v != null).map((v) => normalizeClass(v)).filter(Boolean).join(" ");
  }
  if (typeof value === "object") {
    return Object.entries(value).filter(([, v]) => v).map(([k]) => k).join(" ");
  }
  return void 0;
}
function normalizeStyle(value) {
  if (value == null)
    return void 0;
  if (typeof value === "string")
    return value;
  if (typeof value === "object") {
    return Object.entries(value).filter(([, v]) => v != null).map(([k, v]) => `${kebabCase(k)}:${v}`).join(";");
  }
  return void 0;
}
function kebabCase(str) {
  return str.replace(/([A-Z])/g, "-$1").toLowerCase();
}
function normalizeProps(props) {
  if (!props)
    return {};
  const normalized = { ...props };
  if (normalized.class != null) {
    normalized.class = normalizeClass(normalized.class);
  }
  if (normalized.style != null) {
    normalized.style = normalizeStyle(normalized.style);
  }
  const { key, ref: ref2, ...rest } = normalized;
  return rest;
}
function normalizeChildren(children) {
  if (children.length === 0)
    return null;
  if (children.length === 1) {
    const child = children[0];
    if (child == null)
      return [];
    if (typeof child === "string" || typeof child === "number") {
      return [{ type: Text, children: String(child), props: null, key: null, ref: null, shapeFlag: VNodeShapeFlags.TEXT_NODE, patchFlag: SharedPatchFlags.NONE, dynamicProps: [], el: null, anchor: null, parent: null, componentInstance: null, component: void 0, vnodeType: VNodeType.TEXT }];
    }
    if (Array.isArray(child)) {
      return normalizeChildren(child);
    }
    return [child];
  }
  return children.flatMap((child) => {
    if (child == null)
      return [];
    if (Array.isArray(child))
      return normalizeChildren(child);
    if (typeof child === "string" || typeof child === "number") {
      return [{ type: Text, children: String(child), props: null, key: null, ref: null, shapeFlag: VNodeShapeFlags.TEXT_NODE, patchFlag: SharedPatchFlags.NONE, dynamicProps: [], el: null, anchor: null, parent: null, componentInstance: null, component: void 0, vnodeType: VNodeType.TEXT }];
    }
    return [child];
  });
}
function computeFlags(type, props, children) {
  let flags = SharedPatchFlags.NONE;
  if (type === VNodeType.ELEMENT && !props && (!children || typeof children === "string")) {
    return SharedPatchFlags.NONE;
  }
  if (props && Object.keys(props).length > 0) {
    const hasEvent = Object.keys(props).some((k) => k.startsWith("on"));
    const hasClass = "class" in props;
    const hasStyle = "style" in props;
    if (hasEvent)
      flags |= SharedPatchFlags.EVENTS;
    if (hasClass)
      flags |= SharedPatchFlags.CLASS;
    if (hasStyle)
      flags |= SharedPatchFlags.STYLE;
    if (!hasEvent && !hasClass && !hasStyle)
      flags |= SharedPatchFlags.PROPS;
  }
  if (children != null && typeof children !== "string") {
    if (Array.isArray(children)) {
      const hasKeyed = children.some((c) => c && typeof c === "object" && "key" in c && c.key != null);
      flags |= hasKeyed ? SharedPatchFlags.KEYED_FRAGMENT : SharedPatchFlags.UNKEYED_FRAGMENT;
    } else {
      flags |= SharedPatchFlags.TEXT;
    }
  }
  return flags || SharedPatchFlags.NONE;
}
function h(type, props, ...children) {
  let normalizedProps;
  let normalizedChildren;
  let key = null;
  let ref2 = null;
  if (props != null && !Array.isArray(props) && typeof props === "object" && !props.__v_isVNode) {
    ({ key = null, ref: ref2 = null, ...normalizedProps } = props);
    normalizedProps = normalizeProps(normalizedProps);
    normalizedChildren = normalizeChildren(children);
  } else {
    normalizedProps = {};
    normalizedChildren = normalizeChildren([props, ...children]);
  }
  let vnodeType;
  let component = void 0;
  if (typeof type === "string") {
    vnodeType = VNodeType.ELEMENT;
  } else if (typeof type === "function" || type && typeof type === "object") {
    if (type.__v_isFragment) {
      vnodeType = VNodeType.FRAGMENT;
    } else if ("__v_isComponent" in type) {
      vnodeType = VNodeType.COMPONENT;
      component = type;
    } else if ("render" in type) {
      vnodeType = VNodeType.COMPONENT;
      component = type;
    } else {
      vnodeType = VNodeType.COMPONENT;
      component = type;
    }
  } else {
    vnodeType = VNodeType.TEXT;
  }
  const patchFlag = computeFlags(vnodeType, normalizedProps, normalizedChildren);
  const vnode = {
    type,
    props: normalizedProps,
    children: normalizedChildren,
    key,
    ref: ref2,
    component,
    vnodeType,
    patchFlag,
    dynamicProps: patchFlag & SharedPatchFlags.PROPS ? Object.keys(normalizedProps).filter((k) => !["class", "style"].includes(k)) : [],
    el: null,
    anchor: null,
    parent: null,
    componentInstance: null,
    shapeFlag: getShapeFlag(vnodeType, normalizedChildren)
  };
  return vnode;
}
var VNodeShapeFlags = {
  ELEMENT: 1,
  COMPONENT: 1 << 1,
  TEXT_NODE: 1 << 2,
  FRAGMENT: 1 << 3,
  TELEPORT: 1 << 4,
  SUSPENSE: 1 << 5,
  ARRAY_CHILDREN: 1 << 6,
  TEXT_CHILDREN: 1 << 7
};
function getShapeFlag(type, children) {
  let flag = 0;
  switch (type) {
    case VNodeType.ELEMENT:
      flag = VNodeShapeFlags.ELEMENT;
      break;
    case VNodeType.COMPONENT:
      flag = VNodeShapeFlags.COMPONENT;
      break;
    case VNodeType.TEXT:
      flag = VNodeShapeFlags.TEXT_NODE;
      break;
    case VNodeType.FRAGMENT:
      flag = VNodeShapeFlags.FRAGMENT;
      break;
    case VNodeType.TELEPORT:
      flag = VNodeShapeFlags.TELEPORT;
      break;
    case VNodeType.SUSPENSE:
      flag = VNodeShapeFlags.SUSPENSE;
      break;
    default:
      flag = VNodeShapeFlags.ELEMENT;
  }
  if (children != null) {
    if (Array.isArray(children)) {
      flag |= VNodeShapeFlags.ARRAY_CHILDREN;
    } else if (typeof children === "string") {
      flag |= VNodeShapeFlags.TEXT_CHILDREN;
    }
  }
  return flag;
}
function Fragment(props, ...children) {
  return h(Fragment, props, ...children);
}
Fragment.__v_isFragment = true;
function Text(text) {
  return {
    type: Text,
    props: null,
    children: String(text),
    key: null,
    ref: null,
    shapeFlag: VNodeShapeFlags.TEXT_NODE,
    patchFlag: SharedPatchFlags.NONE,
    dynamicProps: [],
    el: null,
    anchor: null,
    parent: null,
    componentInstance: null,
    component: void 0,
    vnodeType: VNodeType.TEXT
  };
}
function Comment(text) {
  return {
    type: Comment,
    props: null,
    children: text,
    key: null,
    ref: null,
    shapeFlag: VNodeShapeFlags.TEXT_NODE,
    patchFlag: SharedPatchFlags.NONE,
    dynamicProps: [],
    el: null,
    anchor: null,
    parent: null,
    componentInstance: null,
    component: void 0,
    vnodeType: VNodeType.COMMENT
  };
}
var jsx = h;
var jsxs = h;
var jsxDEV = h;
var FragmentSymbol = VNodeType.FRAGMENT;

// upfault/packages/runtime/src/index.ts
import { VNodeType as VNodeType3 } from "@upfault/shared/diff";

// upfault/packages/runtime/src/lifecycle.ts
import { effect, stopEffect } from "@upfault/reactivity";
var currentInstance = null;
function getCurrentInstance() {
  return currentInstance;
}
function setCurrentInstance(instance) {
  currentInstance = instance;
}
function injectHook(hookName, hook, instance = currentInstance) {
  if (!instance) {
    warn(`[UpFault] ${hookName} \u53EA\u80FD\u5728 setup() \u6216\u7EC4\u4EF6\u521D\u59CB\u5316\u65F6\u8C03\u7528`);
    return false;
  }
  if (!instance[hookName]) {
    instance[hookName] = [];
  }
  instance[hookName].push(hook);
  return true;
}
function onBeforeMount(hook, instance) {
  injectHook("onBeforeMount", hook, instance);
}
function onMounted(hook, instance) {
  injectHook("onMounted", hook, instance);
}
function onBeforeUpdate(hook, instance) {