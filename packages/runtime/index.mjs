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