// 仅用于 CJS 构建的 footer（esbuild --footer:js=<本文件>）：
// 让 `require('@upfault/eslint-plugin')` 直接拿到插件对象，而不是 `{ default: 插件 }`。
// 保留 `default` 键以兼容两种写法。
if (module.exports && module.exports.default && module.exports.default.meta) {
  const plugin = module.exports.default;
  module.exports = plugin;
  plugin.default = plugin;
}
