import { Router } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import type { AuthedRequest } from "../middleware/auth";
import { authMiddleware, requireRole } from "../middleware/auth";
import { combineDateAndTime, formatDate, isWithinOneHourBeforeClass } from "../utils/time";

const r = Router();

/** 会员：预约 */
r.post("/book", authMiddleware, requireRole("MEMBER"), async (req: AuthedRequest, res) => {
  const { scheduleId } = req.body as { scheduleId?: string };
  if (!scheduleId) return res.status(400).json({ ok: false, message: "缺少时段 ID" });
  const memberId = req.user!.sub;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const schedule = await tx.coachSchedule.findUnique({ where: { id: scheduleId } });
      if (!schedule || schedule.isClosed) {
        throw new Error("SLOT_INVALID");
      }
      const closedDay = await tx.coachClosedDay.findUnique({
        where: { coachId_date: { coachId: schedule.coachId, date: schedule.date } },
      });
      if (closedDay) throw new Error("DAY_CLOSED");

      const rel = await tx.coachMemberRelation.findFirst({
        where: { coachId: schedule.coachId, memberId, status: "active" },
      });
      if (!rel) throw new Error("NOT_BOUND");

      const bookedCount = await tx.appointment.count({
        where: { scheduleId, status: "BOOKED" },
      });
      if (bookedCount >= schedule.maxBookings) throw new Error("FULL");

      await tx.appointment.create({
        data: {
          coachId: schedule.coachId,
          memberId,
          scheduleId,
          appointmentDate: schedule.date,
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          status: "BOOKED",
        },
      });
      return schedule;
    });

    return res.json({ ok: true, message: "预约成功", data: result });
  } catch (e: unknown) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return res.status(409).json({ ok: false, message: "您已预约该时段，请勿重复提交" });
    }
    const msg = e instanceof Error ? e.message : "";
    if (msg === "FULL") return res.status(400).json({ ok: false, message: "该时段已满员" });
    if (msg === "SLOT_INVALID") return res.status(400).json({ ok: false, message: "时段不可用或已关闭" });
    if (msg === "DAY_CLOSED") return res.status(400).json({ ok: false, message: "教练已关闭该日预约" });
    if (msg === "NOT_BOUND") return res.status(403).json({ ok: false, message: "请先选择并绑定该教练" });
    throw e;
  }
});

/** 会员：取消预约（开课 1 小时内不可取消，后端强校验） */
r.post("/cancel/:id", authMiddleware, requireRole("MEMBER"), async (req: AuthedRequest, res) => {
  const { id } = req.params;
  const ap = await prisma.appointment.findFirst({
    where: { id, memberId: req.user!.sub, status: "BOOKED" },
  });
  if (!ap) return res.status(404).json({ ok: false, message: "预约不存在或已取消" });

  const dateStr = formatDate(new Date(ap.appointmentDate));
  const startAt = combineDateAndTime(dateStr, ap.startTime);
  if (isWithinOneHourBeforeClass(startAt)) {
    return res.status(400).json({ ok: false, message: "距离开课不足 1 小时，无法取消" });
  }

  await prisma.appointment.update({
    where: { id },
    data: { status: "CANCELLED" },
  });
  return res.json({ ok: true, message: "已取消预约" });
});

/** 会员：我的预约 */
r.get("/mine", authMiddleware, requireRole("MEMBER"), async (req: AuthedRequest, res) => {
  const list = await prisma.appointment.findMany({
    where: { memberId: req.user!.sub },
    include: {
      coach: { select: { id: true, nickname: true, phone: true } },
      schedule: true,
    },
    orderBy: [{ appointmentDate: "desc" }, { startTime: "desc" }],
    take: 100,
  });
  const data = list.map((a) => {
    const dateStr = formatDate(new Date(a.appointmentDate));
    const startAt = combineDateAndTime(dateStr, a.startTime);
    const canCancel = a.status === "BOOKED" && !isWithinOneHourBeforeClass(startAt);
    return {
      id: a.id,
      status: a.status,
      appointmentDate: dateStr,
      startTime: a.startTime,
      endTime: a.endTime,
      coach: a.coach,
      canCancel,
    };
  });
  return res.json({ ok: true, data });
});

/** 教练：预约列表 */
r.get("/coach", authMiddleware, requireRole("COACH"), async (req: AuthedRequest, res) => {
  const list = await prisma.appointment.findMany({
    where: { coachId: req.user!.sub },
    include: {
      member: { select: { id: true, nickname: true, phone: true } },
      schedule: true,
    },
    orderBy: [{ appointmentDate: "desc" }, { startTime: "desc" }],
    take: 100,
  });
  const data = list.map((a) => ({
    id: a.id,
    status: a.status,
    appointmentDate: formatDate(new Date(a.appointmentDate)),
    startTime: a.startTime,
    endTime: a.endTime,
    member: a.member,
  }));
  return res.json({ ok: true, data });
});

export const appointmentsRouter = r;
