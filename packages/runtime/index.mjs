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