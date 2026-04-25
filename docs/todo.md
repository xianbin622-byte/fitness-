# 后续可优化项

1. **小程序 TypeScript**：为页面与 `utils` 增加 `ts` + 构建脚本，与后端类型共享（可生成 OpenAPI）。
2. **PostgreSQL 生产部署**：迁移文件、连接池、备份策略。
3. **语音识别**：教练课后笔记已对接 **微信同声传译插件**（纯客户端听写）。
4. **LLM**：在 `ruleEngine` 同级增加 `llmAdapter.ts`，保留 `generateSummaryDraft` 等函数名，内部切换规则/模型。
5. **3D 体型**：替换 `components/body-silhouette` 为 Three.js 小程序适配方案或 WebView。
6. **饼图**：在 `body-trend` 增加体脂区间等分布（需产品定义维度）。
7. **并发与性能**：预约高峰时读写分离、Redis 分布式锁（当前 SQLite/唯一约束已防双约）。
8. **安全**：接口限流、密码强度、刷新令牌、HTTPS 强制。
9. **教练多端日程**：周视图、复制上周课表。
10. **单元测试**：预约取消边界、规则引擎用例。
