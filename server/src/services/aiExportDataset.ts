import { createHmac } from "crypto";
import { prisma } from "../lib/prisma";

export type AiExportOptions = {
  /** 为 true 时用 sha256 生成假名 id，并去掉手机/邮箱/openid */
  anonymize: boolean;
  salt: string;
};

function pseudoMemberId(memberId: string, salt: string): string {
  return createHmac("sha256", salt).update(`m|${memberId}`).digest("hex").slice(0, 16);
}

/**
 * 供微信外优化模型/分析：聚合会员档案、体测时间线、课程文字（总结/笔记/计划/饮食建议）
 */
export async function buildAiExportDataset(opts: AiExportOptions) {
  const { anonymize, salt } = opts;
  const mid = (id: string) => (anonymize ? pseudoMemberId(id, salt) : id);

  const members = await prisma.user.findMany({
    where: { role: "MEMBER" },
    select: {
      id: true,
      nickname: true,
      phone: true,
      email: true,
      wechatOpenId: true,
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
      createdAt: true,
    },
  });

  const bodyRows = await prisma.bodyMeasurement.findMany({
    orderBy: { recordDate: "asc" },
  });

  const courseRows = await prisma.courseRecord.findMany({
    orderBy: { createdAt: "desc" },
    take: 5000,
    select: {
      id: true,
      memberId: true,
      coachId: true,
      summary: true,
      coachNotes: true,
      nextCoursePlan: true,
      dietAdvice: true,
      issues: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const membersOut = members.map((u) => ({
    id: mid(u.id),
    rawId: anonymize ? undefined : u.id,
    nickname: anonymize ? "*" : u.nickname,
    phone: anonymize ? null : u.phone,
    email: anonymize ? null : u.email,
    wechatOpenId: anonymize ? null : u.wechatOpenId,
    heightCm: u.heightCm,
    weightKg: u.weightKg,
    bodyFatPct: u.bodyFatPct,
    skeletalMusclePct: u.skeletalMusclePct,
    waistCm: u.waistCm,
    hipCm: u.hipCm,
    birthday: u.birthday ? u.birthday.toISOString().slice(0, 10) : null,
    exercisePreference: u.exercisePreference,
    gender: u.gender,
    memberProfileAt: u.memberProfileAt ? u.memberProfileAt.toISOString() : null,
    createdAt: u.createdAt.toISOString(),
  }));

  const bodyOut = bodyRows.map((b) => ({
    id: b.id,
    memberId: mid(b.memberId),
    coachId: b.coachId ? (anonymize ? null : b.coachId) : null,
    recordDate: b.recordDate.toISOString().slice(0, 10),
    weight: b.weight,
    bodyFat: b.bodyFat,
    skeletalMuscle: b.skeletalMuscle,
    waist: b.waist,
    hip: b.hip,
    height: b.height,
    notes: b.notes,
  }));

  const courseOut = courseRows.map((c) => ({
    id: c.id,
    memberId: mid(c.memberId),
    coachId: anonymize ? null : c.coachId,
    summary: c.summary,
    coachNotes: c.coachNotes,
    nextCoursePlan: c.nextCoursePlan,
    dietAdvice: c.dietAdvice,
    issues: c.issues,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  }));

  const jsonlLines: string[] = [];
  for (const m of membersOut) {
    const parts: string[] = [];
    if (m.exercisePreference) parts.push(`运动偏好: ${m.exercisePreference}`);
    if (m.gender) parts.push(`性别: ${m.gender}`);
    if (m.heightCm) parts.push(`身高: ${m.heightCm}cm`);
    if (m.bodyFatPct != null) parts.push(`档案体脂%: ${m.bodyFatPct}`);
    const t = parts.join("；");
    if (t) {
      jsonlLines.push(
        JSON.stringify({
          type: "member_profile",
          memberRef: m.id,
          text: t,
        }),
      );
    }
  }
  for (const c of courseOut) {
    const chunks: string[] = [];
    if (c.summary) chunks.push(`课总结: ${c.summary}`);
    if (c.coachNotes) chunks.push(`教练笔记: ${c.coachNotes}`);
    if (c.nextCoursePlan) chunks.push(`下节/一日建议: ${c.nextCoursePlan}`);
    if (c.dietAdvice) chunks.push(`饮食: ${c.dietAdvice}`);
    if (c.issues) chunks.push(`问题: ${c.issues}`);
    const text = chunks.join("\n");
    if (text.trim()) {
      jsonlLines.push(
        JSON.stringify({
          type: "coaching_record",
          memberRef: c.memberId,
          courseRecordId: c.id,
          text,
        }),
      );
    }
  }

  return {
    exportedAt: new Date().toISOString(),
    version: 1,
    anonymize,
    members: membersOut,
    bodyMeasurements: bodyOut,
    courseRecords: courseOut,
    jsonlText: jsonlLines.join("\n") + (jsonlLines.length ? "\n" : ""),
  };
}

export function getExportOptionsFromEnv(): AiExportOptions {
  const salt = process.env.EXPORT_SALT || process.env.JWT_SECRET || "export-salt-change-in-production";
  const anonymize = process.env.AI_EXPORT_ANONYMIZE === "1" || process.env.AI_EXPORT_ANONYMIZE === "true";
  return { anonymize, salt };
}
