import { Router } from "express";
import { prisma } from "../lib/prisma";
import type { AuthedRequest } from "../middleware/auth";
import { authMiddleware, requireRole } from "../middleware/auth";

const r = Router();

function parseDate(d: string): Date {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, day, 12, 0, 0));
}

/** 会员/教练：查看某日教练的可预约时段（含是否已被预约） */
r.get("/coach/:coachId/day/:date", authMiddleware, async (req, res) => {
  const { coachId, date } = req.params;
  const day = parseDate(date);
  const closed = await prisma.coachClosedDay.findUnique({
    where: { coachId_date: { coachId, date: day } },
  });
  const schedules = await prisma.coachSchedule.findMany({
    where: { coachId, date: day },
    orderBy: { startTime: "asc" },
  });
  const ids = schedules.map((s) => s.id);
  const booked = await prisma.appointment.findMany({
    where: { scheduleId: { in: ids }, status: "BOOKED" },
    select: { scheduleId: true, memberId: true },
  });
  const bookedMap = new Map(booked.map((b) => [b.scheduleId, b.memberId]));
  const data = schedules.map((s) => ({
    id: s.id,
    date: date,
    startTime: s.startTime,
    endTime: s.endTime,
    isClosed: s.isClosed || !!closed,
    isBooked: bookedMap.has(s.id),
    bookedByMe: bookedMap.get(s.id) === (req as AuthedRequest).user?.sub,
  }));
  return res.json({ ok: true, data: { dayClosed: !!closed, slots: data } });
});

/** 教练：批量创建固定模板时段（同一天多个连续小时段） */
r.post("/templates", authMiddleware, requireRole("COACH"), async (req: AuthedRequest, res) => {
  const { date, slots } = req.body as {
    date?: string;
    slots?: { startTime: string; endTime: string }[];
  };
  if (!date || !slots?.length) {
    return res.status(400).json({ ok: false, message: "请提供日期与时段列表" });
  }
  const day = parseDate(date);
  const coachId = req.user!.sub;
  const created = await prisma.$transaction(
    slots.map((s) =>
      prisma.coachSchedule.create({
        data: {
          coachId,
          date: day,
          startTime: s.startTime,
          endTime: s.endTime,
          isClosed: false,
        },
      })
    )
  );
  return res.json({ ok: true, data: created });
});

/** 教练：自定义新增单个时段 */
r.post("/slot", authMiddleware, requireRole("COACH"), async (req: AuthedRequest, res) => {
  const { date, startTime, endTime } = req.body as {
    date?: string;
    startTime?: string;
    endTime?: string;
  };
  if (!date || !startTime || !endTime) {
    return res.status(400).json({ ok: false, message: "请填写日期与起止时间" });
  }
  const day = parseDate(date);
  const row = await prisma.coachSchedule.create({
    data: {
      coachId: req.user!.sub,
      date: day,
      startTime,
      endTime,
    },
  });
  return res.json({ ok: true, data: row });
});

/** 教练：删除某时段 */
r.delete("/slot/:id", authMiddleware, requireRole("COACH"), async (req: AuthedRequest, res) => {
  const { id } = req.params;
  const s = await prisma.coachSchedule.findFirst({ where: { id, coachId: req.user!.sub } });
  if (!s) return res.status(404).json({ ok: false, message: "时段不存在" });
  const ap = await prisma.appointment.findFirst({ where: { scheduleId: id, status: "BOOKED" } });
  if (ap) return res.status(400).json({ ok: false, message: "该时段已有预约，无法删除" });
  await prisma.coachSchedule.delete({ where: { id } });
  return res.json({ ok: true, message: "已删除" });
});

/** 教练：关闭某日全天 */
r.post("/close-day", authMiddleware, requireRole("COACH"), async (req: AuthedRequest, res) => {
  const { date } = req.body as { date?: string };
  if (!date) return res.status(400).json({ ok: false, message: "请提供日期" });
  const day = parseDate(date);
  const coachId = req.user!.sub;
  await prisma.coachClosedDay.upsert({
    where: { coachId_date: { coachId, date: day } },
    create: { coachId, date: day },
    update: {},
  });
  await prisma.coachSchedule.updateMany({
    where: { coachId, date: day },
    data: { isClosed: true },
  });
  return res.json({ ok: true, message: "该日已关闭预约" });
});

/** 教练：取消关闭某日（重新开放，需手动恢复各时段 isClosed 为 false） */
r.post("/open-day", authMiddleware, requireRole("COACH"), async (req: AuthedRequest, res) => {
  const { date } = req.body as { date?: string };
  if (!date) return res.status(400).json({ ok: false, message: "请提供日期" });
  const day = parseDate(date);
  const coachId = req.user!.sub;
  await prisma.coachClosedDay.deleteMany({ where: { coachId, date: day } });
  await prisma.coachSchedule.updateMany({
    where: { coachId, date: day },
    data: { isClosed: false },
  });
  return res.json({ ok: true, message: "该日已重新开放（时段已解锁）" });
});

export const schedulesRouter = r;
