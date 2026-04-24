import { Router } from "express";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import type { AuthedRequest } from "../middleware/auth";
import { authMiddleware, requireRole } from "../middleware/auth";

const r = Router();

/** 会员：教练列表（可筛选） */
r.get("/list", authMiddleware, requireRole("MEMBER"), async (_req: AuthedRequest, res) => {
  const coaches = await prisma.user.findMany({
    where: { role: "COACH" },
    select: { id: true, nickname: true, phone: true, avatar: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  return res.json({ ok: true, data: coaches });
});

/** 会员：选择/绑定教练 */
r.post("/bind", authMiddleware, requireRole("MEMBER"), async (req: AuthedRequest, res) => {
  const { coachId } = req.body as { coachId?: string };
  if (!coachId) return res.status(400).json({ ok: false, message: "缺少教练 ID" });
  const coach = await prisma.user.findFirst({ where: { id: coachId, role: "COACH" } });
  if (!coach) return res.status(404).json({ ok: false, message: "教练不存在" });
  await prisma.coachMemberRelation.upsert({
    where: { coachId_memberId: { coachId, memberId: req.user!.sub } },
    create: { coachId, memberId: req.user!.sub, status: "active" },
    update: { status: "active" },
  });
  return res.json({ ok: true, message: "已绑定教练" });
});

/** 会员：当前绑定的教练 */
r.get("/my-coach", authMiddleware, requireRole("MEMBER"), async (req: AuthedRequest, res) => {
  const rel = await prisma.coachMemberRelation.findFirst({
    where: { memberId: req.user!.sub, status: "active" },
    include: { coach: { select: { id: true, nickname: true, phone: true, avatar: true } } },
  });
  return res.json({ ok: true, data: rel?.coach ?? null });
});

/** 教练：我的会员列表 */
r.get("/members", authMiddleware, requireRole("COACH"), async (req: AuthedRequest, res) => {
  const list = await prisma.coachMemberRelation.findMany({
    where: { coachId: req.user!.sub, status: "active" },
    include: {
      member: { select: { id: true, nickname: true, phone: true, avatar: true, createdAt: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return res.json({
    ok: true,
    data: list.map((x) => ({ relationId: x.id, ...x.member })),
  });
});

/** 教练：创建虚拟会员（用于本地联调闪记笔/语音转文字） */
r.post("/members/virtual", authMiddleware, requireRole("COACH"), async (req: AuthedRequest, res) => {
  const now = Date.now();
  const nickname = `测试会员${String(now).slice(-4)}`;
  const passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 10);
  const member = await prisma.user.create({
    data: {
      role: "MEMBER",
      nickname,
      passwordHash,
      memberProfileAt: new Date(),
    },
    select: { id: true, nickname: true, phone: true, avatar: true, createdAt: true },
  });
  await prisma.coachMemberRelation.upsert({
    where: { coachId_memberId: { coachId: req.user!.sub, memberId: member.id } },
    create: { coachId: req.user!.sub, memberId: member.id, status: "active" },
    update: { status: "active" },
  });
  return res.json({ ok: true, data: member, message: "已创建虚拟会员，可直接测试闪记笔语音转文字" });
});

/** 教练：会员详情（基础信息） */
r.get("/members/:memberId", authMiddleware, requireRole("COACH"), async (req: AuthedRequest, res) => {
  const { memberId } = req.params;
  const rel = await prisma.coachMemberRelation.findFirst({
    where: { coachId: req.user!.sub, memberId, status: "active" },
    include: { member: { select: { id: true, nickname: true, phone: true, avatar: true } } },
  });
  if (!rel) return res.status(404).json({ ok: false, message: "非本教练会员或未绑定" });
  const lastBody = await prisma.bodyMeasurement.findFirst({
    where: { memberId },
    orderBy: { recordDate: "desc" },
  });
  return res.json({ ok: true, data: { member: rel.member, latestBody: lastBody } });
});

export const coachesRouter = r;
