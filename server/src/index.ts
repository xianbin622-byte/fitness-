import dotenv from "dotenv";
/** 保留启动前已设置的 PORT（如 SMOKE_PORT=3099），避免被 .env 里 PORT=3000 盖掉 */
const portFromEnv = process.env.PORT;
dotenv.config({ override: true });
if (portFromEnv) process.env.PORT = portFromEnv;
import express from "express";
import cors from "cors";
import { authRouter } from "./routes/auth";
import { coachesRouter } from "./routes/coaches";
import { schedulesRouter } from "./routes/schedules";
import { appointmentsRouter } from "./routes/appointments";
import { bodyRouter } from "./routes/body";
import { coursesRouter } from "./routes/courses";
import { aiRouter } from "./routes/ai";
import { memberProfileSave, memberRouter } from "./routes/member";
import { dataExportRouter } from "./routes/dataExport";
import { authMiddleware, requireRole } from "./middleware/auth";

const app = express();
const preferredPort = Number(process.env.PORT) || 3000;
/** 首选端口被占用时，最多顺延尝试的端口数（如 3000→3001→…） */
const PORT_FALLBACK_MAX = 8;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "10mb" }));

app.get("/", (_req, res) => {
  const port = Number(process.env.PORT) || preferredPort;
  res.type("json").send({
    ok: true,
    service: "fitness-coach-api",
    message: "后端已启动。业务接口前缀为 /api；小程序请把 apiBase 设为与当前端口一致。",
    port,
    health: "/health",
    api: "/api",
  });
});

app.get("/health", (_req, res) => res.json({ ok: true, service: "fitness-coach-api" }));

/** 首登身体资料：在根应用上注册，避免仅依赖子 Router 时旧构建未包含路径；小程序用 POST */
app.post("/api/member/profile", authMiddleware, requireRole("MEMBER"), memberProfileSave);
app.put("/api/member/profile", authMiddleware, requireRole("MEMBER"), memberProfileSave);

app.use("/api/auth", authRouter);
app.use("/api/coaches", coachesRouter);
app.use("/api/schedules", schedulesRouter);
app.use("/api/appointments", appointmentsRouter);
app.use("/api/body", bodyRouter);
app.use("/api/courses", coursesRouter);
app.use("/api/ai", aiRouter);
app.use("/api/member", memberRouter);
app.use("/api/data-export", dataExportRouter);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ ok: false, message: err.message || "服务器错误" });
});

function listenFrom(port: number) {
  const server = app.listen(port, () => {
    process.env.PORT = String(port);
    if (port !== preferredPort) {
      console.warn(
        `[端口] ${preferredPort} 已被占用，已改用 ${port}。请将 miniprogram/config/runtime.js 里 DEVELOPMENT_API_BASE 改为 http://127.0.0.1:${port}`,
      );
    }
    console.log(`健身私教 API 已启动: http://localhost:${port}`);
  });
  server.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE") {
      if (port - preferredPort < PORT_FALLBACK_MAX) {
        const next = port + 1;
        console.warn(`[端口] ${port} 已被占用，尝试 ${next}…`);
        listenFrom(next);
        return;
      }
      console.error(
        `[端口] ${preferredPort}～${port} 均被占用。请先结束旧进程后再启动，例如: lsof -ti:${preferredPort} | xargs kill -9`,
      );
      process.exit(1);
    }
    console.error(err);
    process.exit(1);
  });
}

listenFrom(preferredPort);
