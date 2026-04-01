import path from "path";
import fs from "fs";
import { Router } from "express";
import multer from "multer";
import { v4 as uuid } from "uuid";
import { prisma } from "../lib/prisma";
import type { AuthedRequest } from "../middleware/auth";
import { authMiddleware, requireRole } from "../middleware/auth";
import { speechToTextFromUrl } from "../services/speechToText.stub";

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

  // 自动转写：当前先走 stub；若为空则返回 null（前端不再用固定文案覆盖问题点）
  const asrText = await speechToTextFromUrl(voiceUrl);
  const transcript = (asrText || "").trim() || null;

  return res.json({
    ok: true,
    data: {
      voiceUrl,
      /** 当前为自动转写占位；后续可替换为真实 ASR 结果 */
      transcript,
    },
    message: transcript ? "上传成功，已完成转文字" : "上传成功，自动转写暂不可用",
  });
});

export const uploadRouter = r;
