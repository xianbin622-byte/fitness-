import { Router } from "express";
import { prisma } from "../lib/prisma";
import type { AuthedRequest } from "../middleware/auth";
import { authMiddleware, requireRole } from "../middleware/auth";

const r = Router();

function parseDate(d: string): Date {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, day, 12, 0, 0));
}

/** 教练：录入/更新会员身体数据 */
r.post("/", authMiddleware, requireRole("COACH"), async (req: AuthedRequest, res) => {
  const b = req.body as {
    memberId?: string;
    recordDate?: string;
    gender?: string;
    age?: number;
    height?: number;
    weight?: number;
    bodyFat?: number;
    waist?: number;
    hip?: number;
    thigh?: number;
    chest?: number;
    arm?: number;
    skeletalMuscle?: number;
    notes?: string;
  };
  if (!b.memberId || !b.recordDate) {
    return res.status(400).json({ ok: false, message: "缺少会员或记录日期" });
  }
  const rel = await prisma.coachMemberRelation.findFirst({
    where: { coachId: req.user!.sub, memberId: b.memberId, status: "active" },
  });
  if (!rel) return res.status(403).json({ ok: false, message: "无权为该会员录入数据" });

  const row = await prisma.bodyMeasurement.create({
    data: {
      memberId: b.memberId,
      coachId: req.user!.sub,
      recordDate: parseDate(b.recordDate),
      gender: b.gender,
      age: b.age,
      height: b.height,
      weight: b.weight,
      bodyFat: b.bodyFat,
      waist: b.waist,
      hip: b.hip,
      thigh: b.thigh,
      chest: b.chest,
      arm: b.arm,
      skeletalMuscle: b.skeletalMuscle,
      notes: b.notes,
    },
  });
  return res.json({ ok: true, data: row });
});

/** 会员：我的身体数据列表 */
r.get("/mine", authMiddleware, requireRole("MEMBER"), async (req: AuthedRequest, res) => {
  const list = await prisma.bodyMeasurement.findMany({
    where: { memberId: req.user!.sub },
    orderBy: { recordDate: "asc" },
  });
  return res.json({ ok: true, data: list });
});

/** 会员：自录一条身体数据（无教练时 coachId 为空） */
r.post("/self", authMiddleware, requireRole("MEMBER"), async (req: AuthedRequest, res) => {
  const b = req.body as {
    recordDate: string;
    weight?: number;
    bodyFat?: number;
    skeletalMuscle?: number;
    waist?: number;
    hip?: number;
    height?: number;
    notes?: string;
  };
  if (!b.recordDate) {
    return res.status(400).json({ ok: false, message: "请填写记录日期" });
  }
  const row = await prisma.bodyMeasurement.create({
    data: {
      memberId: req.user!.sub,
      coachId: null,
      recordDate: parseDate(b.recordDate),
      weight: b.weight,
      bodyFat: b.bodyFat,
      skeletalMuscle: b.skeletalMuscle,
      waist: b.waist,
      hip: b.hip,
      height: b.height,
      notes: b.notes,
    },
  });
  return res.json({ ok: true, data: row });
});

/** 教练：某会员身体数据 */
r.get("/member/:memberId", authMiddleware, requireRole("COACH"), async (req: AuthedRequest, res) => {
  const { memberId } = req.params;
  const rel = await prisma.coachMemberRelation.findFirst({
    where: { coachId: req.user!.sub, memberId, status: "active" },
  });
  if (!rel) return res.status(403).json({ ok: false, message: "无权查看" });
  const list = await prisma.bodyMeasurement.findMany({
    where: { memberId },
    orderBy: { recordDate: "asc" },
  });
  return res.json({ ok: true, data: list });
});

export const bodyRouter = r;
