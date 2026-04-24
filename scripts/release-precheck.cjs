#!/usr/bin/env node
/**
 * 发布前自动检查（本地可执行）
 * 用法：node scripts/release-precheck.cjs
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const fail = [];
const warn = [];

function read(p) {
  return fs.readFileSync(path.resolve(root, p), "utf8");
}

function ok(msg) {
  console.log("✅", msg);
}

function checkRuntime() {
  const text = read("miniprogram/config/runtime.js");
  const useProd = /USE_PROD_API:\s*true/.test(text);
  const hasPlaceholder = /PRODUCTION_API_BASE:\s*["']https:\/\/请替换为你的HTTPS域名["']/.test(text);
  if (!useProd) {
    warn.push(
      "miniprogram/config/runtime.js：USE_PROD_API 未为 true（本地开发可忽略；上传体验版/正式版前请改为 true）",
    );
  }
  if (useProd && hasPlaceholder) fail.push("miniprogram/config/runtime.js 的 PRODUCTION_API_BASE 仍是占位符");
  if (useProd && !hasPlaceholder) ok("小程序 runtime 生产配置已填写");
}

function checkAppId() {
  const text = read("project.config.json");
  const m = text.match(/"appid"\s*:\s*"([^"]+)"/);
  const appid = m ? m[1] : "";
  if (!appid || appid === "touristappid") {
    fail.push("project.config.json 仍为 touristappid，请改成你的小程序正式 AppID");
  } else {
    ok(`AppID 已配置：${appid}`);
  }
}

function checkEnvTemplate() {
  const p = path.resolve(root, "server/.env.prod");
  if (!fs.existsSync(p)) {
    warn.push("未发现 server/.env.prod，可先执行 npm run server:gen-env 生成模板");
    return;
  }
  const env = fs.readFileSync(p, "utf8");
  if (/JWT_SECRET=.*(请修改|dev-jwt-secret)/.test(env)) fail.push("server/.env.prod 的 JWT_SECRET 仍为默认/占位");
  if (/PUBLIC_BASE_URL=.*localhost|127\.0\.0\.1/.test(env)) fail.push("server/.env.prod 的 PUBLIC_BASE_URL 仍指向本地");
  if (/WECHAT_APPID="\s*"/.test(env)) fail.push("server/.env.prod 的 WECHAT_APPID 为空");
  if (/WECHAT_APP_SECRET="\s*"/.test(env)) {
    warn.push("server/.env.prod 的 WECHAT_APP_SECRET 在当前执行环境中为空（若你已在 IDE 填写，请以服务器实机 .env 为准）");
  }
  if (!fail.length) ok("server/.env.prod 关键字段检查通过");
}

function main() {
  console.log("=== Release Precheck ===");
  checkRuntime();
  checkAppId();
  checkEnvTemplate();

  if (warn.length) {
    console.log("\n⚠️ 提示：");
    for (const w of warn) console.log("-", w);
  }
  if (fail.length) {
    console.log("\n❌ 未通过：");
    for (const f of fail) console.log("-", f);
    process.exit(1);
  }
  console.log("\n🎉 通过：可继续提审/发布流程。");
}

main();
