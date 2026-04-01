/**
 * 将 threejs-miniprogram 的 dist 同步到 miniprogram_npm/（与微信「构建 npm」产物路径一致），
 * 避免在组件里 require('threejs-miniprogram') 时被解析成 components/.../threejs-miniprogram。
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const src = path.join(root, "node_modules/threejs-miniprogram/dist/index.js");
const destDir = path.join(root, "miniprogram_npm/threejs-miniprogram");
const dest = path.join(destDir, "index.js");

if (!fs.existsSync(src)) {
  console.warn("[copy-threejs-npm] 跳过：未找到 node_modules/threejs-miniprogram，请先 npm install");
  process.exit(0);
}
fs.mkdirSync(destDir, { recursive: true });
fs.copyFileSync(src, dest);
console.log("[copy-threejs-npm] 已写入", path.relative(root, dest));
