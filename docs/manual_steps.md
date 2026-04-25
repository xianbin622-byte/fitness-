# 必须人工操作的步骤

以下步骤无法由本仓库在任意机器上自动完成，需你本地执行：

1. **安装 Node.js**（建议 20 LTS）与 **npm**。
2. **安装微信开发者工具**，并登录微信开发者账号（真机预览需合法域名或调试设置）。
3. **导入小程序项目**：选择本仓库根目录；若仅拷贝 `miniprogram` 子目录，需自行补全 `project.config.json` 或调整 `miniprogramRoot`。
4. **配置后端地址**：在 `miniprogram/app.js` 修改 `globalData.apiBase`：
   - 模拟器：`http://127.0.0.1:3000`
   - 真机：改为电脑的 **局域网 IP**，且手机与电脑同一 WiFi。
5. **（必做）解决「域名不在列表」报错**：若出现 `request:fail url not in domain list`，在微信开发者工具中：
   - 点击顶部 **「详情」**
   - 打开 **「本地设置」**
   - **勾选**：**「不校验合法域名、web-view（业务域名）、TLS 版本以及 HTTPS 证书」**
   - 重新编译后再试（仅开发环境使用；正式上架不可用此项）。
6. **微信小程序正式上架**：注册小程序主体、配置 **request 合法域名**（HTTPS）、上传代码与提审（本仓库未包含云托管与域名证书）。
7. **生产环境密钥**：修改 `server/.env` 中的 `JWT_SECRET`，勿使用默认示例值。
8. **可选 Docker**：若使用 PostgreSQL，本机需安装 Docker Desktop 或兼容运行时，再执行 `docker compose up -d`。

---

## 联调与试用

1. **先启动后端**（在 `server` 目录，保持终端不关）：

   ```bash
   npm install && npm run db:push && npm run db:seed && npm run build && npm start
   ```

2. 再按上文 **勾选不校验合法域名**，否则请求会被微信拦截。

3. **邮箱验证码**：开发环境验证码会出现在接口返回的 `debugCode`、弹窗或 **后端终端日志**；生产需在服务器配置 SMTP（`server/.env.example`）。

---

## 内置测试账号（跑过 `npm run db:seed` 后可用）

| 角色 | 手机号 | 密码 |
|------|--------|------|
| 教练 | 13800000001 | 123456 |
| 会员 | 13800000002 | 123456 |

登录页可 **只填手机号 + 密码**（验证码行留空），即可试用。

完成以上步骤后，更多说明见根目录 `README.md`。

---

## Git（保存代码版本）

日常只需三条命令：`git status` → `git add -A` → `git commit -m "说明"`。  
**详细步骤、如何推到 GitHub/Gitee** 见 **`docs/git_guide.md`**（建议通读一遍）。

---

## 教练课后笔记：微信同声传译插件（听写）

业务上 **不上传录音、不做服务端语音转写**，仅在小程序内用官方插件把语音转成文字。

1. 登录 [微信公众平台](https://mp.weixin.qq.com/) → 你的小程序 → **设置** → **第三方设置** → **插件管理** → 添加 **微信同声传译**（插件 AppID 一般为 **`wx069ba97219f66d99`**；**个人主体**可能无法添加部分插件，以后台提示为准）。
2. 代码侧：`miniprogram/app.json` 已配置 `plugins.WechatSI`；页面内 `requirePlugin('WechatSI')` 与 `getRecordRecognitionManager()` 见 **`pages/coach/member-note/member-note.js`**。
3. 上架与隐私、麦克风说明：**`docs/wechat_publish_steps.md`**；仅负责人能点的后台步骤：**`docs/OWNER_ONLY_STEPS.md`**。
4. 添加或升级插件版本后，在微信开发者工具 **重新编译**；若插件市场有更新，请把 `app.json` 里 `WechatSI` 的 `version` 改为与后台一致的版本号。
