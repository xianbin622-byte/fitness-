import { Router, type Response } from "express";
import { prisma } from "../lib/prisma";
import type { AuthedRequest } from "../middleware/auth";
import { authMiddleware, requireRole } from "../middleware/auth";

const GENDERS = new Set(["MALE", "FEMALE", "UNSPECIFIED"]);

/** 由 index.ts 显式挂到 /api/member/profile（避免仅依赖 Router 挂载时因构建/旧进程未更新导致 404） */
export const memberProfileSave = async (req: AuthedRequest, res: Response) => {
  const b = req.body as {
    heightCm?: number;
    weightKg?: number;
    bodyFatPct?: number;
    skeletalMusclePct?: number;
    waistCm?: number;
    hipCm?: number;
    birthday?: string;
    exercisePreference?: string;
    gender?: string;
  };
  const birthday =
    b.birthday && /^\d{4}-\d{2}-\d{2}$/.test(b.birthday) ? new Date(b.birthday + "T12:00:00.000Z") : undefined;
  const gender = b.gender && GENDERS.has(b.gender) ? b.gender : undefined;

  const u = await prisma.user.update({
    where: { id: req.user!.sub },
    data: {
      ...(b.heightCm != null ? { heightCm: b.heightCm } : {}),
      ...(b.weightKg != null ? { weightKg: b.weightKg } : {}),
      ...(b.bodyFatPct != null ? { bodyFatPct: b.bodyFatPct } : {}),
      ...(b.skeletalMusclePct != null ? { skeletalMusclePct: b.skeletalMusclePct } : {}),
      ...(b.waistCm != null ? { waistCm: b.waistCm } : {}),
      ...(b.hipCm != null ? { hipCm: b.hipCm } : {}),
      ...(birthday ? { birthday } : {}),
      ...(b.exercisePreference != null
        ? { exercisePreference: String(b.exercisePreference).trim() || null }
        : {}),
      ...(gender != null ? { gender } : {}),
      memberProfileAt: new Date(),
    },
    select: {
      id: true,
      phone: true,
      nickname: true,
      role: true,
      avatar: true,
      heightCm: true,
      weightKg: true,
      bodyFatPct: true,
      skeletalMusclePct: true,
      waistCm: true,
      hipCm: true,
      birthday: true,
      exercisePreference: true,
      gender: true,
      memberProfileAt: true,
    },
  });
  return res.json({ ok: true, data: u });
};

const r = Router();

/** 无鉴权：用于浏览器/开发者工具确认 3000 端口已是当前仓库构建（应返回 200 而非 404） */
r.get("/health", (_req, res) => {
  res.json({
    ok: true,
    memberProfile: "POST or PUT /api/member/profile",
  });
});

/** 运动等级与经验（由上课完成次数、身体自录条数等推算） */
r.get("/fitness", authMiddleware, requireRole("MEMBER"), async (req: AuthedRequest, res) => {
  const memberId = req.user!.sub;
  const [completedClasses, bodyRows] = await Promise.all([
    prisma.appointment.count({ where: { memberId, status: "COMPLETED" } }),
    prisma.bodyMeasurement.count({ where: { memberId } }),
  ]);
  const totalExp = completedClasses * 25 + bodyRows * 8 + 5;
  const nextExp = 100;
  const level = Math.min(1 + Math.floor(totalExp / nextExp), 99);
  const exp = totalExp % nextExp;
  return res.json({
    ok: true,
    data: {
      level,
      exp,
      nextExp,
      totalExp,
      completedClasses,
      bodyRecords: bodyRows,
    },
  });
});

export const memberRouter = r;
