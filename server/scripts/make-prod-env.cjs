#!/usr/bin/env node
/**
 * 从 .env.example 生成 .env.prod 模板，便于部署前填写。
 * 用法：cd server && node scripts/make-prod-env.cjs
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const serverDir = path.resolve(__dirname, "..");
const src = path.join(serverDir, ".env.example");
const dst = path.join(serverDir, ".env.prod");

if (!fs.existsSync(src)) {
  console.error("未找到 .env.example");
  process.exit(1);
}

const raw = fs.readFileSync(src, "utf8");
const secureSecret = crypto.randomBytes(24).toString("hex");
const exportKey = crypto.randomBytes(24).toString("hex");
const exportSalt = crypto.randomBytes(16).toString("hex");

const out = raw
  .replace('NODE_ENV="development"', 'NODE_ENV="production"')
  .replace('DATABASE_URL="file:./dev.db"', 'DATABASE_URL="file:./prod.db"')
  .replace('JWT_SECRET="请修改为随机长字符串"', `JWT_SECRET="${secureSecret}"`)
  .replace('EXPORT_API_KEY=""', `EXPORT_API_KEY="${exportKey}"`)
  .replace('EXPORT_SALT=""', `EXPORT_SALT="${exportSalt}"`)
  .replace('AI_EXPORT_ANONYMIZE="0"', 'AI_EXPORT_ANONYMIZE="1"')
  .replace('PUBLIC_BASE_URL="http://localhost:3000"', 'PUBLIC_BASE_URL="https://api.laohuangfit.cn"');

fs.writeFileSync(dst, out, "utf8");
console.log("已生成", dst);
console.log("请手工填写 WECHAT_APPID / WECHAT_APP_SECRET / SMTP_* 等字段后再部署。");
