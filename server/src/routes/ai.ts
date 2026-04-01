import { Router } from "express";
import { authMiddleware, requireRole } from "../middleware/auth";
import { generateSessionSummary, generateTrainPlan, type SessionSummaryInput, type GeneratePlanInput } from "../services/ai.service";
import type { AuthedRequest } from "../middleware/auth";
import { prisma } from "../lib/prisma";
import { generateTrainingPlan } from "../services/ai";

const r = Router();

/** 教练：根据闪记转写 notes + 身体数据生成三段式总结（MVP：规则引擎/或 Kimi） */
r.post("/session-summary", authMiddleware, requireRole("COACH"), async (req: AuthedRequest, res) => {
  const body = req.body as SessionSummaryInput;
  const notes = (body?.notes || "").trim();
  if (!notes) {
    return res.status(400).json({ ok: false, message: "缺少 notes（转写文本）" });
  }
  try {
    const data = await generateSessionSummary({ notes, bodyData: body.bodyData });
    return res.json({ ok: true, data });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "生成失败" });
  }
});

/** 会员：接入 Kimi 生成训练计划（如未配置 KIMI_API_KEY 则降级规则版） */
r.post("/generate-plan", authMiddleware, requireRole("MEMBER"), async (req: AuthedRequest, res) => {
  const body = req.body as Partial<GeneratePlanInput>;
  const weight = Number(body?.weight);
  const bodyFat = Number(body?.bodyFat);
  const muscleMass = Number(body?.muscleMass);
  const goal = String(body?.goal || "");
  const experience = String(body?.experience || "");

  if (!Number.isFinite(weight) || !Number.isFinite(bodyFat) || !Number.isFinite(muscleMass) || !goal || !experience) {
    return res.status(400).json({ ok: false, message: "参数不完整" });
  }

  try {
    const data = await generateTrainPlan({ weight, bodyFat, muscleMass, goal, experience });
    return res.json({ ok: true, data });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "生成失败" });
  }
});

/** 会员：自动聚合身体数据+最近闪记，生成训练计划与饮食建议 */
r.post("/plan", authMiddleware, requireRole("MEMBER"), async (req: AuthedRequest, res) => {
  try {
    const memberId = req.user!.sub;
    const goal = String(req.body?.goal || "维持");

    const [latestBody, latestCourse] = await Promise.all([
      prisma.bodyMeasurement.findFirst({
        where: { memberId },
        orderBy: { recordDate: "desc" },
      }),
      prisma.courseRecord.findFirst({
        where: { memberId },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const data = await generateTrainingPlan({
      gender: latestBody?.gender || null,
      age: latestBody?.age ?? null,
      height: latestBody?.height ?? null,
      weight: latestBody?.weight ?? null,
      bodyFat: latestBody?.bodyFat ?? null,
      goal,
      recentNotes: latestCourse?.issues || latestCourse?.coachNotes || "",
    });

    return res.json({ ok: true, data });
  } catch {
    return res.json({
      ok: true,
      data: {
        trainingPlan: "每周3-4次训练：以深蹲、硬拉、推举、划船等复合动作为主，每个动作3-4组，每组8-12次。",
        dietAdvice: "每日蛋白质目标按体重1.6-2.0g/kg，训练日适当增加碳水，少油少糖。",
        riskNote: "若膝盖或腰部不适，优先降低负重并减少冲击性动作。",
      },
    });
  }
});

export const aiRouter = r;

