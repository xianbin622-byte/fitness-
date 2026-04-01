# 健身私教 · 会员预约与身体数据管理

微信小程序（会员端 + 教练端）+ Node.js REST API，用于私教排课、身体数据记录、课程闪记与规则引擎生成的课后总结/建议。

## 技术栈

| 层级 | 选型 | 说明 |
|------|------|------|
| 小程序 | 微信原生（JavaScript） | 可直接用微信开发者工具打开；GLB 演示需在 `miniprogram` 下安装依赖并「构建 npm」 |
| 后端 | Node.js 20+、Express、TypeScript | REST API、JWT、Multer 上传 |
| 数据库 | SQLite（默认） | 零依赖本地文件 `server/dev.db`；生产可换 PostgreSQL，见下文 |
| ORM | Prisma 5 | `schema.prisma` 即数据模型 |
| 图表 | Canvas 2D | 身体数据折线图（MVP） |
| 体型 | 自定义组件 `body-silhouette` | 伪 3D 轮廓，可替换为 Three.js 等 |

## 目录结构

```
fitness-coach-app/
├── docker-compose.yml          # 可选：本地 PostgreSQL
├── project.config.json         # 微信项目配置（miniprogramRoot: miniprogram/）
├── miniprogram/                # 小程序源码
│   ├── app.js / app.json / app.wxss
│   ├── components/body-silhouette/   # 体型可视化（可升级）
│   ├── components/body-gltf/         # Three.js + 包内 GLB（演示）
│   ├── libs/gltf-loader.js           # GLTFLoader（官方示例适配）
│   ├── assets/models/                # 示例 duck.glb（可替换）
│   ├── pages/                  # 登录、会员端、教练端全部页面
│   └── utils/request.js、api.js      # 请求封装与接口
├── server/
│   ├── prisma/schema.prisma    # 数据模型
│   ├── prisma/seed.cjs         # 种子数据
│   ├── src/                    # Express 路由与服务
│   └── uploads/                # 语音等上传（运行时生成）
└── docs/                       # 需求、待办、人工步骤
```

## 安装与启动（后端）

```bash
cd server
cp .env.example .env   # 已含 SQLite 默认配置时可跳过
npm install
npm run db:push        # 同步数据库结构
npm run db:seed        # 测试账号与示例时段、身体数据
npm run build          # 编译 TypeScript
npm start              # 默认 PORT=3000
```

开发热重载（需本机 `tsx` 可用）：

```bash
npm run dev
```

若 `tsx` 报错，请使用 `npm run build && npm start`。

## 数据库

- **默认**：`DATABASE_URL="file:./dev.db"`（SQLite），适合演示与本地开发。
- **PostgreSQL**：安装 Docker 后执行 `docker compose up -d`，将 `.env` 中 `DATABASE_URL` 改为 `postgresql://postgres:postgres@localhost:5432/fitness_coach?schema=public`，并把 `schema.prisma` 里 `datasource` 的 `provider` 改为 `postgresql`，再执行 `npx prisma db push` 与 `npm run db:seed`。

## 微信开发者工具导入

1. 打开微信开发者工具 → 导入项目。
2. 目录选择本仓库根目录 `fitness-coach-app`（需包含 `project.config.json` 与 `miniprogram/`）。
3. AppID 可使用测试号或 `touristappid`（仅开发调试）。
4. **重要**：在 `miniprogram/app.js` 中将 `globalData.apiBase` 改为你的后端地址：
   - 模拟器访问本机：`http://127.0.0.1:3000`
   - **真机调试**：改为电脑局域网 IP，如 `http://192.168.1.5:3000`。

### 新手必做：否则会出现 `request:fail url not in domain list`

微信默认禁止访问未备案的域名；**本地开发**必须在开发者工具里关掉校验（仅开发环境使用）：

1. 打开微信开发者工具，打开本项目。
2. 顶部菜单点 **「详情」**（或右侧/顶部工具栏里的「详情」按钮）。
3. 切到 **「本地设置」** 这一栏。
4. **勾选**：**「不校验合法域名、web-view（业务域名）、TLS 版本以及 HTTPS 证书」**。
5. 点 **「编译」** 或保存后重新编译，再试「获取验证码」或登录。

上架正式版时不能使用此项，需在公众平台配置 HTTPS 合法域名。

### 可选：GLB / Three.js 演示页（`body-gltf`）

1. 终端：`cd miniprogram && npm install`（会 **自动生成** `miniprogram_npm/threejs-miniprogram/`，无需再点「构建 npm」即可跑 Duck 演示）。
2. 微信开发者工具：**普通编译 ▼ → 添加编译模式**，启动页填 **`pages/dev/body-gltf-demo/body-gltf-demo`** 后编译。

**小白逐步说明（含编译模式、白框说明）**：见 **`docs/manual_steps.md`**。

`body-gltf` 使用显式路径引用 `miniprogram_npm`，避免 `require('threejs-miniprogram')` 在组件内被误解析；业务页面不依赖该组件。

## 新手 5 分钟试用（推荐先用密码登录）

**第 1 步：启动后端**（终端执行，保持窗口不要关）：

```bash
cd server
npm install
npm run db:push
npm run db:seed
npm run build
npm start
```

看到终端输出「健身私教 API 已启动」即成功（默认端口 **3000**）。

**第 2 步**：按上一节 **勾选「不校验合法域名」**，并确认 `miniprogram/app.js` 里 `apiBase` 为 `http://127.0.0.1:3000`（模拟器）。

**第 3 步**：在小程序 **登录页** 使用下表账号（**验证码可先不填**，只在第二行填 **密码** 即可登录）：

## 测试账号（种子数据，密码已内置）

| 角色 | 手机号 | 密码 | 说明 |
|------|--------|------|------|
| **教练** | `13800000001` | `123456` | 登录后进「教练工作台」 |
| **会员** | `13800000002` | `123456` | 登录后进「会员工作台」；已与上面教练绑定 |

种子会：绑定会员与教练、创建未来两天可约时段、写入两条身体数据。

**想用短信验证码时**：先点「获取验证码」，再填 6 位码登录（需已勾选不校验域名且后端已启动）。

**短信验证码（MVP）**：`POST /api/auth/sms/send` 下发 6 位验证码（内存存储，5 分钟有效）。开发环境下接口会返回 `debugCode` 便于联调；终端也会打印验证码。**生产环境**需接入腾讯云/阿里云短信等，并勿在响应中返回验证码。

## 已实现功能（MVP）

- 注册/登录（**短信验证码**注册与登录；种子账号仍支持密码）、JWT、会员/教练角色
- 会员选择教练并绑定；教练查看会员列表
- 教练设置时间表（固定模板 + 自定义时段）、关闭某日/重新开放
- 会员预约、同一时段唯一预约（数据库唯一约束 + 事务）
- 取消规则：距开课不足 1 小时不可取消（服务端校验）
- 身体数据录入与会员查看、趋势折线图、体型轮廓组件
- 闪记：动作/问题点/备注、录音上传（语音转文字占位）
- 规则引擎生成课程总结、下次建议、饮食建议；教练确认页
- 上传文件静态访问 `/uploads`

## 后续升级（未完全实现）

- 生产级短信通道（当前为内存验证码 + 开发环境 `debugCode`）
- 语音识别 ASR、LLM 总结（接口与占位已预留）
- 真 3D 体型（已有 `body-gltf` 演示 + `body-advanced` 几何体方案）
- 饼图等更多图表
- 消息推送、支付、多教练排班冲突高级策略

详见 `docs/todo.md`。

## API 前缀

所有业务接口前缀：`/api`（如 `/api/auth/login`）。

## 版本管理与上线

- 项目根目录已初始化 **Git**（`main` 分支）；日常用 `git add` / `git commit`，并推送到 **GitHub / Gitee** 等远程仓库备份。**操作步骤见 `docs/git_guide.md`。**
- **正式上线前**请阅读 **`docs/DEPLOY_CHECKLIST.md`**（域名、HTTPS、`apiBase`、密钥等须自行在微信公众平台与服务器上配置）。

## 许可证

MIT（示例项目，请按需修改）。
