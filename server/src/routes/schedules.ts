import { Router } from "express";
import { prisma } from "../lib/prisma";
import type { AuthedRequest } from "../middleware/auth";
import { authMiddleware, requireRole } from "../middleware/auth";

const r = Router();

const WD = ["日", "一", "二", "三", "四", "五", "六"];

function parseDate(d: string): Date {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, day, 12, 0, 0));
}

async function buildDaySlotsData(coachId: string, date: string, userSub: string | undefined) {
  const day = parseDate(date);
  const closed = await prisma.coachClosedDay.findUnique({
    where: { coachId_date: { coachId, date: day } },
  });
  const schedules = await prisma.coachSchedule.findMany({
    where: { coachId, date: day },
    orderBy: { startTime: "asc" },
  });
  const ids = schedules.map((s) => s.id);
  const bookedRows = await prisma.appointment.findMany({
    where: { scheduleId: { in: ids }, status: "BOOKED" },
    select: { scheduleId: true, memberId: true },
  });
  const countMap = new Map<string, number>();
  const mineSet = new Set<string>();
  for (const b of bookedRows) {
    countMap.set(b.scheduleId, (countMap.get(b.scheduleId) || 0) + 1);
    if (b.memberId === userSub) mineSet.add(b.scheduleId);
  }

  const slots = schedules.map((s) => {
    const bookedCount = countMap.get(s.id) || 0;
    const maxB = s.maxBookings;
    const isFull = bookedCount >= maxB;
    const bookedByMe = mineSet.has(s.id);
    const blocked = !!closed || s.isClosed;
    return {
      id: s.id,
      date,
      startTime: s.startTime,
      endTime: s.endTime,
      title: s.title || "可预约时段",
      slotKind: s.slotKind,
      maxBookings: maxB,
      theme: s.theme || "default",
      bookedCount,
      isClosed: s.isClosed || !!closed,
      isFull,
      bookedByMe,
      /** 旧字段兼容：已满 */
      isBooked: isFull,
      canBook: !blocked && !isFull && !bookedByMe,
    };
  });

  return { dayClosed: !!closed, slots };
}

/** 一周视图：weekStart 为周一 YYYY-MM-DD */
r.get("/coach/:coachId/week/:weekStart", authMiddleware, async (req, res) => {
  const { coachId, weekStart } = req.params;
  const uid = (req as AuthedRequest).user?.sub;
  const start = parseDate(weekStart);
  const days: Array<{
    date: string;
    weekdayLabel: string;
    isToday: boolean;
    dayClosed: boolean;
    slots: Awaited<ReturnType<typeof buildDaySlotsData>>["slots"];
  }> = [];

  const now = new Date();
  const ty = now.getFullYear();
  const tm = String(now.getMonth() + 1).padStart(2, "0");
  const td = String(now.getDate()).padStart(2, "0");
  const todayStr = `${ty}-${tm}-${td}`;

  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    const dateStr = `${y}-${m}-${day}`;
    const { dayClosed, slots } = await buildDaySlotsData(coachId, dateStr, uid);
    const wdi = d.getUTCDay();
    days.push({
      date: dateStr,
      weekdayLabel: WD[wdi],
      isToday: dateStr === todayStr,
      dayClosed,
      slots,
    });
  }

  return res.json({ ok: true, data: { days } });
});

/** 会员/教练：查看某日教练的可预约时段 */
r.get("/coach/:coachId/day/:date", authMiddleware, async (req, res) => {
  const { coachId, date } = req.params;
  const uid = (req as AuthedRequest).user?.sub;
  const { dayClosed, slots } = await buildDaySlotsData(coachId, date, uid);
  return res.json({ ok: true, data: { dayClosed, slots } });
});

/** 教练：批量创建时段（可带课程名、类型、容量） */
r.post("/templates", authMiddleware, requireRole("COACH"), async (req: AuthedRequest, res) => {
  const { date, slots } = req.body as {
    date?: string;
    slots?: Array<{
      startTime: string;
      endTime: string;
      title?: string;
      slotKind?: string;
      maxBookings?: number;
      theme?: string;
    }>;
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
          title: s.title ?? null,
          slotKind: s.slotKind === "PRIVATE" ? "PRIVATE" : "COURSE",
          maxBookings: typeof s.maxBookings === "number" && s.maxBookings > 0 ? s.maxBookings : 1,
          theme: s.theme ?? null,
        },
      })
    )
  );
  return res.json({ ok: true, data: created });
});

/** 教练：新增单个时段 */
r.post("/slot", authMiddleware, requireRole("COACH"), async (req: AuthedRequest, res) => {
  const { date, startTime, endTime, title, slotKind, maxBookings, theme } = req.body as {
    date?: string;
    startTime?: string;
    endTime?: string;
    title?: string;
    slotKind?: string;
    maxBookings?: number;
    theme?: string;
  };
  if (!date || !startTime || !endTime) {
    return res.status(400).json({ ok: false, message: "请填写日期与起止时间" });
  }
  const day = parseDate(date);
  const maxB =
    typeof maxBookings === "number" && maxBookings > 0 ? Math.min(maxBookings, 99) : 1;
  const row = await prisma.coachSchedule.create({
    data: {
      coachId: req.user!.sub,
      date: day,
      startTime,
      endTime,
      title: title?.trim() || null,
      slotKind: slotKind === "PRIVATE" ? "PRIVATE" : "COURSE",
      maxBookings: maxB,
      theme: theme?.trim() || null,
    },
  });
  return res.json({ ok: true, data: row });
});

/** 教练：修改时段展示信息（不影响已预约） */
r.patch("/slot/:id", authMiddleware, requireRole("COACH"), async (req: AuthedRequest, res) => {
  const { id } = req.params;
  const { title, slotKind, maxBookings, theme, isClosed } = req.body as {
    title?: string;
    slotKind?: string;
    maxBookings?: number;
    theme?: string;
    isClosed?: boolean;
  };
  const s = await prisma.coachSchedule.findFirst({ where: { id, coachId: req.user!.sub } });
  if (!s) return res.status(404).json({ ok: false, message: "时段不存在" });
  const booked = await prisma.appointment.count({
    where: { scheduleId: id, status: "BOOKED" },
  });
  const nextMax =
    typeof maxBookings === "number" && maxBookings > 0 ? Math.min(maxBookings, 99) : s.maxBookings;
  if (nextMax < booked) {
    return res.status(400).json({ ok: false, message: "最大人数不能小于当前已预约数" });
  }
  const row = await prisma.coachSchedule.update({
    where: { id },
    data: {
      ...(title !== undefined ? { title: title.trim() || null } : {}),
      ...(slotKind !== undefined
        ? { slotKind: slotKind === "PRIVATE" ? "PRIVATE" : "COURSE" }
        : {}),
      ...(maxBookings !== undefined ? { maxBookings: nextMax } : {}),
      ...(theme !== undefined ? { theme: theme.trim() || null } : {}),
      ...(isClosed !== undefined ? { isClosed: !!isClosed } : {}),
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
