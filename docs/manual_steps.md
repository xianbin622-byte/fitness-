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

## 可选：打开 GLB 三维演示页（Three.js + 小黄鸭模型）

### 第 0 步：在终端生成 `miniprogram_npm`（必做一次）

本仓库在 **`miniprogram/package.json`** 里配置了 **`postinstall`**：你在 **`miniprogram`** 目录执行 **`npm install`** 后，会自动把 `threejs-miniprogram` 拷到 **`miniprogram/miniprogram_npm/threejs-miniprogram/`**，**不必**再在微信开发者工具里点「构建 npm」也能跑 GLB 演示。

若左侧文件树里 **没有** `miniprogram_npm` 文件夹，请在终端执行：

```bash
cd miniprogram
npm install
```

若仍没有，可手动执行：`node scripts/copy-threejs-npm.js`（在 `miniprogram` 目录下）。

**说明**：以前若在组件里写 `require('threejs-miniprogram')`，微信会把路径错当成 `components/body-gltf/...`，已改为显式引用 `miniprogram_npm` + 上述脚本，避免该错误。

### 第 1 步：用「编译模式」打开 GLB 演示页（只能在你本机开发者工具里点）

1. 看开发者工具 **顶部中间**，一般有 **「普通编译」** 按钮（或显示当前启动路径）。
2. 点 **「普通编译」右侧的小三角 ▼**（或「添加编译模式」）。
3. 选择 **「添加编译模式」**。
4. 在 **「启动页面」** 里填入（可复制粘贴）：`pages/dev/body-gltf-demo/body-gltf-demo`
5. 名称可填：`GLB 演示`，保存。
6. 在编译方式里 **选中刚加的这一条**，再点 **「编译」**。

### 第 2 步：若仍报错

- 打开 **「控制台」**，看红色报错。
- 确认 **`miniprogram/miniprogram_npm/threejs-miniprogram/index.js`** 文件存在。

### （可选）工具 → 构建 npm

只有当你 **还引入了其它 npm 包**、需要按微信官方流程统一构建时，再在 **详情 → 本地设置** 勾选 **「使用 npm 模块」**，菜单 **工具 → 构建 npm**。本项目的 Duck 演示 **不依赖** 这一步。

**说明**：其它业务页面 **不依赖** GLB 步骤。

---

## 你截图里「3D 体型 Advanced」上面是白框？

那一页是 **`body-advanced-demo`**（几何体小人），**不是** GLB 小黄鸭页；**不需要** 构建 npm。

- 若白框一直无画面：在 **「详情」→「本地设置」** 里把 **基础库版本** 调到较新（如 **2.20+**），再点 **「编译」**；仍不行则看 **控制台** 是否有 WebGL 相关报错。
- 若要看 **小黄鸭 GLB**：请按上文 **「编译模式」** 打开 **`pages/dev/body-gltf-demo/body-gltf-demo`**。
