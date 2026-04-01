import { Router } from "express";
import { prisma } from "../lib/prisma";
import type { AuthedRequest } from "../middleware/auth";
import { authMiddleware, requireRole } from "../middleware/auth";
import { type FlashPayload } from "../services/ruleEngine";
import { generateSessionSummary } from "../services/ai.service";

const r = Router();

/** 会员：上课记录列表（须放在 /:id 之前） */
r.get("/mine", authMiddleware, requireRole("MEMBER"), async (req: AuthedRequest, res) => {
  const list = await prisma.courseRecord.findMany({
    where: { memberId: req.user!.sub },
    include: {
      coach: { select: { id: true, nickname: true } },
      exerciseItems: true,
      appointment: true,
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return res.json({ ok: true, data: list });
});

/** 教练：某会员最近一条课程记录（用于饮食/建议编辑） */
r.get("/coach/by-member/:memberId", authMiddleware, requireRole("COACH"), async (req: AuthedRequest, res) => {
  const { memberId } = req.params;
  const rel = await prisma.coachMemberRelation.findFirst({
    where: { coachId: req.user!.sub, memberId, status: "active" },
  });
  if (!rel) return res.status(403).json({ ok: false, message: "无权查看该会员" });
  const last = await prisma.courseRecord.findFirst({
    where: { memberId, coachId: req.user!.sub },
    orderBy: { updatedAt: "desc" },
  });
  return res.json({ ok: true, data: last });
});

/** 会员：下一节课建议与饮食（取最近一次有建议的记录） */
r.get("/next-advice", authMiddleware, requireRole("MEMBER"), async (req: AuthedRequest, res) => {
  const last = await prisma.courseRecord.findFirst({
    where: { memberId: req.user!.sub, NOT: { nextCoursePlan: null } },
    orderBy: { updatedAt: "desc" },
  });
  return res.json({
    ok: true,
    data: {
      nextCoursePlan: last?.nextCoursePlan ?? "暂无，请等待教练课后录入。",
      dietAdvice: last?.dietAdvice ?? "均衡饮食，足量蛋白质与蔬菜。",
      summary: last?.summary ?? null,
    },
  });
});

/** 教练：开始闪记 — 创建或获取与预约关联的课程记录草稿 */
r.post("/flash/start", authMiddleware, requireRole("COACH"), async (req: AuthedRequest, res) => {
  const { appointmentId, memberId } = req.body as { appointmentId?: string; memberId?: string };
  if (!appointmentId || !memberId) {
    return res.status(400).json({ ok: false, message: "请提供预约与会员" });
  }
  const ap = await prisma.appointment.findFirst({
    where: {
      id: appointmentId,
      coachId: req.user!.sub,
      memberId,
      status: "BOOKED",
    },
  });
  if (!ap) return res.status(404).json({ ok: false, message: "预约不存在或状态不符" });

  let record = await prisma.courseRecord.findUnique({ where: { appointmentId } });
  if (!record) {
    record = await prisma.courseRecord.create({
      data: {
        appointmentId,
        coachId: req.user!.sub,
        memberId,
        flashDraftJson: JSON.stringify({ exercises: [], issues: "", coachNotes: "" }),
      },
    });
  }
  return res.json({ ok: true, data: record });
});

/** 教练：保存闪记草稿 */
r.put("/flash/:courseRecordId", authMiddleware, requireRole("COACH"), async (req: AuthedRequest, res) => {
  const { courseRecordId } = req.params;
  const payload = req.body as FlashPayload & { voiceNoteUrl?: string };
  const rec = await prisma.courseRecord.findFirst({
    where: { id: courseRecordId, coachId: req.user!.sub },
  });
  if (!rec) return res.status(404).json({ ok: false, message: "记录不存在" });

  const flash: FlashPayload = {
    exercises: payload.exercises || [],
    issues: payload.issues ?? "",
    coachNotes: payload.coachNotes ?? "",
  };
  await prisma.courseRecord.update({
    where: { id: courseRecordId },
    data: {
      flashDraftJson: JSON.stringify(flash),
      voiceNoteUrl: payload.voiceNoteUrl ?? rec.voiceNoteUrl,
      issues: flash.issues || null,
    },
  });
  await prisma.exerciseItem.deleteMany({ where: { courseRecordId } });
  if (flash.exercises.length) {
    await prisma.exerciseItem.createMany({
      data: flash.exercises.map((e) => ({
        courseRecordId,
        actionName: e.actionName,
        weight: e.weight ?? undefined,
        reps: e.reps ?? undefined,
        sets: e.sets ?? undefined,
        notes: e.notes ?? undefined,
      })),
    });
  }
  return res.json({ ok: true, message: "闪记已保存" });
});

/** 教练：根据闪记生成总结与建议草稿 */
r.post("/flash/:courseRecordId/generate", authMiddleware, requireRole("COACH"), async (req: AuthedRequest, res) => {
  const { courseRecordId } = req.params;
  const rec = await prisma.courseRecord.findFirst({
    where: { id: courseRecordId, coachId: req.user!.sub },
    include: { exerciseItems: true },
  });
  if (!rec) return res.status(404).json({ ok: false, message: "记录不存在" });

  let flash: FlashPayload = { exercises: [], issues: rec.issues || "", coachNotes: rec.coachNotes || "" };
  if (rec.flashDraftJson) {
    try {
      flash = { ...flash, ...JSON.parse(rec.flashDraftJson) };
    } catch {
      /* ignore */
    }
  }
  if (!flash.exercises?.length && rec.exerciseItems.length) {
    flash.exercises = rec.exerciseItems.map((e) => ({
      actionName: e.actionName,
      weight: e.weight,
      reps: e.reps,
      sets: e.sets,
      notes: e.notes,
    }));
  }

  const latestBody = await prisma.bodyMeasurement.findFirst({
    where: { memberId: rec.memberId },
    orderBy: { recordDate: "desc" },
  });
  const bodySnap = latestBody
    ? { weight: latestBody.weight, bodyFat: latestBody.bodyFat, waist: latestBody.waist }
    : undefined;

  const notes = (flash.issues || flash.coachNotes || "").trim();
  const ai = await generateSessionSummary({ notes, bodyData: bodySnap, flash });

  const updated = await prisma.courseRecord.update({
    where: { id: courseRecordId },
    data: { summary: ai.summary, nextCoursePlan: ai.nextPlan, dietAdvice: ai.dietAdvice },
  });
  return res.json({ ok: true, data: updated, aiSource: ai.source });
});

/** 教练：确认并保存总结、建议、饮食（可修改） */
r.put("/:courseRecordId/confirm", authMiddleware, requireRole("COACH"), async (req: AuthedRequest, res) => {
  const { courseRecordId } = req.params;
  const { summary, nextCoursePlan, dietAdvice, coachNotes, completeAppointment } = req.body as {
    summary?: string;
    nextCoursePlan?: string;
    dietAdvice?: string;
    coachNotes?: string;
    /** 为 false 时仅更新文字，不将关联预约标为已完成（如单独编辑饮食建议页） */
    completeAppointment?: boolean;
  };
  const rec = await prisma.courseRecord.findFirst({
    where: { id: courseRecordId, coachId: req.user!.sub },
  });
  if (!rec) return res.status(404).json({ ok: false, message: "记录不存在" });

  const updated = await prisma.courseRecord.update({
    where: { id: courseRecordId },
    data: {
      summary: summary ?? rec.summary,
      nextCoursePlan: nextCoursePlan ?? rec.nextCoursePlan,
      dietAdvice: dietAdvice ?? rec.dietAdvice,
      coachNotes: coachNotes ?? rec.coachNotes,
    },
  });
  if (rec.appointmentId && completeAppointment !== false) {
    await prisma.appointment.update({
      where: { id: rec.appointmentId },
      data: { status: "COMPLETED" },
    });
  }
  return res.json({ ok: true, data: updated });
});

/** 会员/教练：单条课程详情 */
r.get("/:id", authMiddleware, async (req: AuthedRequest, res) => {
  const { id } = req.params;
  const rec = await prisma.courseRecord.findUnique({
    where: { id },
    include: {
      exerciseItems: true,
      coach: { select: { id: true, nickname: true, phone: true } },
      member: { select: { id: true, nickname: true } },
      appointment: true,
    },
  });
  if (!rec) return res.status(404).json({ ok: false, message: "记录不存在" });
  const uid = req.user!.sub;
  if (rec.memberId !== uid && rec.coachId !== uid) {
    return res.status(403).json({ ok: false, message: "无权查看" });
  }
  return res.json({ ok: true, data: rec });
});

export const coursesRouter = r;
