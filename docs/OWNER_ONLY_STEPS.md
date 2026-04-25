# 必须由你本人完成的步骤（按顺序做）

仓库里的代码、Git 初始化、说明文档已就绪。**下面事项无法由他人代登录、代付款、代备案**，请一步一步自行完成。  
（其它细节见 `docs/git_guide.md`、`docs/wechat_publish_steps.md`、`docs/DEPLOY_CHECKLIST.md`。）

---

## A. 把代码备份到 GitHub（约 10 分钟）

1. 浏览器打开 [github.com](https://github.com)，用你的账号登录。
2. 右上角 **+** → **New repository**，仓库名例如 `fitness-coach-app`，选 **Public**，**不要**勾选 Initialize with README（本地已有代码）。
3. 创建后，复制页面上的仓库地址，形如：  
   `https://github.com/你的用户名/fitness-coach-app.git`
4. 在本机打开终端，执行（**把地址换成你的**）：

```bash
cd /Users/huangxianbin/fitness-coach-app
git remote add origin https://github.com/你的用户名/fitness-coach-app.git
```

若提示 `remote origin already exists`，则改为：

```bash
git remote set-url origin https://github.com/你的用户名/fitness-coach-app.git
```

5. 推送：

```bash
git push -u origin main
```

6. 按提示在浏览器登录 GitHub 或输入 **Personal Access Token**（在 GitHub → Settings → Developer settings → Tokens 创建）。**Token 只显示一次，请自己保存好。**

完成後：在 GitHub 网页上应能看到本仓库文件。

---

## B. 准备上线用的服务器与域名（按你选型，无法代操作）

1. 购买或使用一台 **云服务器**（阿里云、腾讯云等）或支持 Node 的 **PaaS**。
2. 准备一个 **已备案的域名**（若使用大陆服务器且要求备案；规则以云厂商与政策为准）。
3. 为该域名配置 **HTTPS 证书**（多数平台可申请免费证书）。
4. 在服务器上安装 Node.js，把本仓库 **`server`** 目录部署上去，配置环境变量（复制 `server/.env.example` 为 `.env` 再改），**生产环境务必修改 `JWT_SECRET`**。
5. 用 Nginx 等将 **HTTPS** 反代到 Node 监听的端口，确保浏览器访问：  
   `https://你的API域名/health`  
   返回 JSON 且 `ok` 为 true。

（具体命令因平台而异，需你按云厂商文档操作。）

---

## C. 微信公众平台（小程序）

1. 打开 [mp.weixin.qq.com](https://mp.weixin.qq.com/)，用主体账号登录（无账号则先 **注册小程序**）。
2. **开发** → **开发管理** → **开发设置**：
   - 记录你的 **AppID**。
   - 在 **服务器域名** 里填写 **request 合法域名**：`https://你的API域名`（无路径，须 HTTPS）。
   - 若以后使用需 **uploadFile** / **downloadFile** 的能力，再补充对应合法域名。
3. **设置** → 基本设置 / **服务类目**：选择与你业务相符的类目。
4. **插件**（仅当你能添加时）：在后台搜索 **插件管理** → 视情况添加 **微信同声传译**（`wx069ba97219f66d99`）。**个人主体常无法添加**；此时代码已支持 **系统键盘听写 + 手动输入**，不必强行配置。
5. 按微信要求填写 **用户隐私保护指引**（涉及手机、身体数据、麦克风等；个人主体以实际采集为准填写）。

---

## D. 改小程序里的接口地址并上传

1. 用微信开发者工具打开本项目根目录。
2. 在 **`project.config.json`**（根目录）里确认 **`appid`** 为你的 **正式小程序 AppID**（不要用长期游客号上线）。
3. 编辑 **`miniprogram/config/runtime.js`**：`USE_PROD_API: true`，`PRODUCTION_API_BASE` 为 **第 B 步可用的 HTTPS API 根**，例如：  
   `https://api.你的域名.com`
4. 开发者工具里 **编译**，用 **真机预览** 测登录、接口是否正常（须已配置合法域名，或临时勾选「不校验」仅调试用）。
5. 菜单 **上传**，填写版本号与说明。
6. 回到公众平台 **版本管理** → **提交审核** → 通过后 **发布**。

---

## E. 密钥与安全（你自己保管）

1. **永远不要**把 `server/.env` 推到公开 GitHub（本仓库已在 `.gitignore` 中忽略）。
2. 生产环境 **JWT_SECRET**、数据库密码、第三方 API Key 只在服务器或私密环境配置。
3. 若仓库曾误提交过密钥，需在服务商处 **轮换密钥**。

---

## 仓库里已为你准备好的（无需重复做）

- Git 仓库与提交历史、`.gitignore`、`docs/git_guide.md`
- `docs/wechat_publish_steps.md`、`docs/DEPLOY_CHECKLIST.md`
- `miniprogram/config/runtime.js` 中切换生产/开发 API（`USE_PROD_API`、`PRODUCTION_API_BASE`）

有新版本时：本地 `git add -A` → `git commit` → `git push`，再按 **D** 上传小程序。
