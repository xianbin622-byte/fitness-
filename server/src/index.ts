import dotenv from "dotenv";
dotenv.config({ override: true });
import path from "path";
import express from "express";
import cors from "cors";
import { authRouter } from "./routes/auth";
import { coachesRouter } from "./routes/coaches";
import { schedulesRouter } from "./routes/schedules";
import { appointmentsRouter } from "./routes/appointments";
import { bodyRouter } from "./routes/body";
import { coursesRouter } from "./routes/courses";
import { uploadRouter } from "./routes/upload";
import { aiRouter } from "./routes/ai";

const app = express();
const preferredPort = Number(process.env.PORT) || 3000;
/** 首选端口被占用时，最多顺延尝试的端口数（如 3000→3001→…） */
const PORT_FALLBACK_MAX = 8;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "10mb" }));

const uploadDir = path.resolve(process.env.UPLOAD_DIR || "./uploads");
app.use("/uploads", express.static(uploadDir));

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

app.use("/api/auth", authRouter);
app.use("/api/coaches", coachesRouter);
app.use("/api/schedules", schedulesRouter);
app.use("/api/appointments", appointmentsRouter);
app.use("/api/body", bodyRouter);
app.use("/api/courses", coursesRouter);
app.use("/api/upload", uploadRouter);
app.use("/api/ai", aiRouter);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ ok: false, message: err.message || "服务器错误" });
});

function listenFrom(port: number) {
  const server = app.listen(port, () => {
    process.env.PORT = String(port);
    if (port !== preferredPort) {
      console.warn(
        `[端口] ${preferredPort} 已被占用，已改用 ${port}。请将 miniprogram/app.js 里 globalData.apiBase 改为 http://127.0.0.1:${port}`,
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
