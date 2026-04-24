import path from "path";
import fs from "fs";
import { Router } from "express";
import multer from "multer";
import { v4 as uuid } from "uuid";
import { prisma } from "../lib/prisma";
import type { AuthedRequest } from "../middleware/auth";
import { authMiddleware, requireRole } from "../middleware/auth";
import { speechToTextFromLocalPath } from "../services/speechToText.stub";

const r = Router();

const uploadDir = path.resolve(process.env.UPLOAD_DIR || "./uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || ".tmp";
    cb(null, `${uuid()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
});

/** 上传语音（MVP：保存文件，预留 speech-to-text） */
r.post("/voice", authMiddleware, requireRole("COACH"), upload.single("file"), async (req: AuthedRequest, res) => {
  const file = req.file;
  if (!file) return res.status(400).json({ ok: false, message: "未收到文件" });

  const base = process.env.PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
  const urlPath = `/uploads/${file.filename}`;
  const voiceUrl = `${base}${urlPath}`;

  await prisma.uploadFile.create({
    data: {
      userId: req.user!.sub,
      path: file.path,
      mimeType: file.mimetype,
    },
  });

  // 自动转写：直接读本机刚保存的文件，避免 PUBLIC_BASE_URL 与监听端口不一致时 fetch 失败
  const asrText = await speechToTextFromLocalPath(file.path, file.originalname);
  const transcript = (asrText || "").trim() || null;

  const noTranscriptHint =
    "上传成功；未转写出文字。请：1）小程序端使用微信同声传译插件；或 2）服务器配置 TENCENTCLOUD_SECRET_ID+KEY（一句话识别）或 OPENAI_API_KEY。Kimi 仅用于文本总结，不做听写。";

  return res.json({
    ok: true,
    data: {
      voiceUrl,
      /** OpenAI 兼容 /v1/audio/transcriptions；未配 key 或失败则为 null */
      transcript,
    },
    message: transcript ? "上传成功，已完成转文字" : noTranscriptHint,
  });
});

export const uploadRouter = r;
