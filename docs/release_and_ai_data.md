# 上线与站外 AI 数据（说明）

## 一、代码里已就绪项

- `miniprogram/config/runtime.js`：切生产时设 `USE_PROD_API: true` 与 `PRODUCTION_API_BASE`（HTTPS，无尾斜杠）。
- `server/.env.example`：已补充 `EXPORT_API_KEY`、`EXPORT_SALT`、`AI_EXPORT_ANONYMIZE`、`NODE_ENV` 等说明。
- 自动化脚本：
  - `npm run server:gen-env`：生成 `server/.env.prod` 模板（自动生成随机 `JWT_SECRET` / `EXPORT_API_KEY` / `EXPORT_SALT`）。
  - `npm run release:check`：发布前自动检查（runtime 生产开关、AppID、`.env.prod` 关键字段）。
- 站外训练/分析数据：
  - **本机/服务器脚本**：`cd server && npm run export:ai`（或仓库根 `npm run export:ai`），输出到 `server/data/ai-exports/`，含 `.json` 与 **`.jsonl`**（每行一条，适合清洗后喂向量库/微调）。
  - **HTTP 拉取**（需配置 `EXPORT_API_KEY`）：
    ```bash
    curl -sS "https://你的API根域名/api/data-export/ai-dataset" -H "X-Export-Key: 与.env中EXPORT_API_KEY相同"
    ```
- 隐私：生产建议设 `AI_EXPORT_ANONYMIZE=1`，导出会假名化会员 id、去手机/邮箱/openid/微信 openid；仍含教练自然语言文本，请遵守《个人信息保护法》与内部安全规范。

## 二、须你人在微信/云控制台完成的

1. **服务器**：域名备案、HTTPS 证书、将 Node 服务部署在公网（或内网+运维转发），开放 `PORT`。
2. **微信公众平台**（小程序）：
   - 开发 / 管理 → 开发管理 → 开发设置 → **服务器域名**（`request`、如用到则 `uploadFile`/`downloadFile`）填你的 API 域名；**不填 IP**，须备案域名。
   - 配置 **WECHAT_APPID / WECHAT_APP_SECRET**（`server/.env`），与线上一致。
3. **正式发包前**：把 `miniprogram/config/runtime.js` 的 `USE_PROD_API` 改为 `true` 并填好 `PRODUCTION_API_BASE`，再上传代码 / 提审。

## 二点五、推荐执行顺序（你当前阶段）

1. 等域名实名认证完成，买下 `laohuangfit.cn`。
2. 服务器部署完成后，在 DNS 里做 `api.laohuangfit.cn -> 服务器公网 IP` 的 A 记录。
3. 执行 `npm run server:gen-env`，填写 `server/.env.prod` 中微信与邮件相关字段。
4. 在 `miniprogram/config/runtime.js` 改成生产地址：`https://api.laohuangfit.cn`。
5. 执行 `npm run release:check`，通过后再上传体验版并提审。

## 三、用导出数据优化 AI 的推荐路径

1. 定期在服务器上跑 `npm run export:ai`（可配 cron），把 `data/ai-exports/*.jsonl` 拷到**无微信环境**的笔记本/数据仓库。  
2. `jsonl` 中 `type: member_profile` 为短文本描述；`type: coaching_record` 为单条课程相关长文本。  
3. 下游可：去重、分词、**embedding** 进向量库；或用 **Kimi/OpenAI** 做摘要/打标签/构造监督数据；再迭代你们现有 `KIMI` 或规则层提示词。  
4. 勿将含真实身份字段的导出发到公共仓库；`AI_EXPORT_ANONYMIZE=1` 为默认安全建议，分析时仍应限制访问范围。
