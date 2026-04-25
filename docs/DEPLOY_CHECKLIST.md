# 上线前检查（本地 Git 已就绪后，仍须你本人完成）

## 仓库与密钥

- **`server/.env` 已加入 `.gitignore`，勿提交。** 生产环境在服务器上单独创建 `.env`，勿把真实密钥推送到公开仓库。
- 生产 **`JWT_SECRET`**：使用长随机串，勿使用示例默认值。
- **`KIMI_API_KEY`**：仅在需要调用 Kimi 时配置；可从 `server/.env.example` 复制结构后本地填写。

## 后端部署

- 生产数据库：按需使用 PostgreSQL 等，并修改 `DATABASE_URL`、运行 `prisma migrate` / `db push`。
- **HTTPS 域名**：小程序 `request` 合法域名须为 **HTTPS**，且与 **`miniprogram/config/runtime.js`** 里 `PRODUCTION_API_BASE`（`USE_PROD_API: true` 时）一致（无路径，如 `https://api.example.com`）。
- 若需对外可访问的公开链接：配置 **`PUBLIC_BASE_URL`**（见 `server/.env.example`）。

## 微信小程序

1. **微信公众平台** → 开发 → 开发管理 → **服务器域名**：配置 request、uploadFile、downloadFile 等合法域名。
2. **`miniprogram/config/runtime.js`**：设 `USE_PROD_API: true`，`PRODUCTION_API_BASE` 为 **生产 API 根**（HTTPS，无尾斜杠）。
3. 关闭开发用「不校验合法域名」仅用于本机调试；**正式版用户设备会校验域名**。
4. 上传代码 → 提交审核 → 发布。

## 可选

- 配置 **业务域名**、**隐私政策**（用户数据收集说明）等，按微信当年审核要求填写。

---

本地开发步骤见 `docs/manual_steps.md` 与根目录 `README.md`。
