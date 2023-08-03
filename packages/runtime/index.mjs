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