import { generateDietAdvice, generateNextCourseAdvice, generateSummaryDraft, type FlashPayload, type BodySnapshot } from "./ruleEngine";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

export type SessionSummaryInput = {
  notes: string;
  bodyData?: BodySnapshot;
  /** 内部用：可提供完整闪记，规则引擎降级时更丰富 */
  flash?: FlashPayload;
};

export type SessionSummaryOutput = {
  summary: string;
  nextPlan: string;
  dietAdvice: string;
  /** debug：来源（不影响前端旧字段） */
  source?: "kimi" | "fallback";
};

export type GeneratePlanInput = {
  weight: number;
  bodyFat: number;
  muscleMass: number;
  goal: string;
  experience: string;
};

export type GeneratePlanOutput = {
  weeklyPlan: Array<{
    day: string;
    workouts: Array<{
      action: string;
      sets: number;
      reps: number;
    }>;
    notes?: string;
  }>;
  tips: string;
  diet: string;
  /** debug：来源（不影响前端旧字段） */
  source?: "kimi" | "fallback";
};

function safeClamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function getKimiApiKey(): string {
  const normalize = (v: unknown) => String(v || "").trim().replace(/^["']|["']$/g, "");
  const isAscii = (s: string) => /^[\x20-\x7E]+$/.test(s);
  const looksLikeKey = (s: string) => {
    if (!s || s.length < 12) return false;
    if (!isAscii(s)) return false;
    const lower = s.toLowerCase();
    if (lower.includes("your") || lower.includes("key") || lower.includes("placeholder")) return false;
    return true;
  };

  const envKimi = normalize(process.env.KIMI_API_KEY);
  if (looksLikeKey(envKimi)) return envKimi;

  const envMoon = normalize(process.env.MOONSHOT_API_KEY);
  if (looksLikeKey(envMoon)) return envMoon;

  // Fallback: directly parse server/.env in case runtime env injection fails.
  try {
    const envPath = path.resolve(process.cwd(), ".env");
    if (fs.existsSync(envPath)) {
      const txt = fs.readFileSync(envPath, "utf8");
      const parsed = dotenv.parse(txt);
      const fileKimi = normalize(parsed.KIMI_API_KEY);
      if (looksLikeKey(fileKimi)) return fileKimi;
      const fileMoon = normalize(parsed.MOONSHOT_API_KEY);
      if (looksLikeKey(fileMoon)) return fileMoon;
    }
  } catch {
    // ignore and fallback to empty
  }

  return "";
}

function tryExtractJson(text: string): any | null {
  if (!text) return null;
  // remove fenced code blocks
  const cleaned = text.replace(/```json/gi, "```").replace(/```/g, "");
  const firstObj = cleaned.indexOf("{");
  const lastObj = cleaned.lastIndexOf("}");
  if (firstObj >= 0 && lastObj > firstObj) {
    const slice = cleaned.slice(firstObj, lastObj + 1);
    try {
      return JSON.parse(slice);
    } catch {
      return null;
    }
  }
  try {
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

async function callKimiJson<T>(params: {
  model: string;
  messages: Array<{ role: "system" | "user"; content: string }>;
}): Promise<T> {
  const apiKey = getKimiApiKey();
  if (!apiKey) throw new Error("KIMI_API_KEY not set");

  const baseUrl = process.env.KIMI_BASE_URL || "https://api.moonshot.cn/v1";
  const url = baseUrl.replace(/\/$/, "") + "/chat/completions";

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: params.model,
      messages: params.messages,
      temperature: 0.35,
    }),
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`Kimi request failed: ${resp.status} ${text}`);
  }

  const data: any = await resp.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string") throw new Error("Kimi response missing content");

  const parsed = tryExtractJson(content);
  if (!parsed) throw new Error("Kimi response is not valid JSON");
  return parsed as T;
}

function fallbackSessionSummary(input: SessionSummaryInput): SessionSummaryOutput {
  const notes = (input.notes || "").trim();
  const flash: FlashPayload = input.flash || { exercises: [], issues: notes, coachNotes: "" };
  const bodySnap = input.bodyData;
  return {
    summary: generateSummaryDraft(flash),
    nextPlan: generateNextCourseAdvice(flash, bodySnap),
    dietAdvice: generateDietAdvice(bodySnap),
    source: "fallback",
  };
}

function fallbackPlan(input: GeneratePlanInput): GeneratePlanOutput {
  // Simple, deterministic plan when Kimi is unavailable.
  const goal = input.goal || "维持";
  return {
    weeklyPlan: [
      {
        day: "周一",
        workouts: [
          { action: "深蹲（或腿举）", sets: 3, reps: 8 },
          { action: "罗马尼亚硬拉", sets: 3, reps: 10 },
          { action: "核心抗伸展（死虫）", sets: 3, reps: 12 },
        ],
      },
      {
        day: "周二",
        workouts: [
          { action: "卧推（或哑铃推举）", sets: 3, reps: 8 },
          { action: "划船（坐姿/俯身）", sets: 3, reps: 10 },
          { action: "肩胛后缩练习", sets: 3, reps: 12 },
        ],
      },
      {
        day: "周三",
        workouts: [
          { action: "髋主导训练（臀桥）", sets: 3, reps: 10 },
          { action: "腿后肌（腿弯举）", sets: 3, reps: 12 },
          { action: "侧平板支撑", sets: 3, reps: 20 },
        ],
      },
      {
        day: "周四",
        workouts: [
          { action: "引体向上/高位下拉", sets: 3, reps: 8 },
          { action: "推举（肩上推举）", sets: 3, reps: 10 },
          { action: "核心Pallof Press", sets: 3, reps: 12 },
        ],
      },
      {
        day: "周五",
        workouts: [
          { action: "硬拉变式（轻中重量）", sets: 3, reps: 6 },
          { action: "弓步蹲", sets: 3, reps: 10 },
          { action: "有氧代谢（可选）", sets: 1, reps: 20 },
        ],
      },
      {
        day: "周六",
        workouts: [
          { action: "全身循环（动作选择因人而异）", sets: 3, reps: 12 },
          { action: "拉伸与放松", sets: 1, reps: 1 },
        ],
      },
      { day: "周日", workouts: [{ action: "休息/轻松步行", sets: 1, reps: 1 }] },
    ],
    tips: `目标：${goal}。建议从“刚好能完成目标次数”的重量开始，每周只做小幅递增，并保证动作幅度与呼吸节奏。`,
    diet: `饮食建议（规则版占位）：优先保证蛋白质摄入，训练日适当增加优质碳水；同时控制总热量与隐形糖油。`,
    source: "fallback",
  };
}

export async function generateSessionSummary(input: SessionSummaryInput): Promise<SessionSummaryOutput> {
  const apiKey = getKimiApiKey();
  if (!apiKey) {
    console.warn("[AI][session-summary] KIMI_API_KEY 未配置，已降级 fallback");
    return fallbackSessionSummary(input);
  }

  const notes = (input.notes || "").trim();
  const body = input.bodyData;
  const bodyText = body
    ? `身体快照：体重=${body.weight ?? "未知"}kg，体脂=${body.bodyFat ?? "未知"}%，腰围=${body.waist ?? "未知"}cm。`
    : `身体快照：未知。`;

  const prompt = [
    "你是一名专业健身教练。",
    "你需要根据：1) 课堂闪记转写 notes；2) 学员最新身体数据，生成三部分内容。",
    "输出必须严格为 JSON，不要输出任何多余文字。",
    "JSON 格式：{ \"summary\": string, \"nextPlan\": string, \"dietAdvice\": string }",
    "要求：",
    "- summary：用简洁要点总结本节课训练情况与关键问题（可引用 notes 里的短语）。",
    "- nextPlan：给出下次训练的建议，包含训练方向与 2-4 条可执行的动作/训练要点。",
    "- dietAdvice：给出饮食注意事项，围绕体脂/腰围变化给出原则性建议。",
    bodyText,
    `notes（转写文本）:\n${notes || "（空）"}`,
  ].join("\n");

  try {
    const parsed = await callKimiJson<{ summary: string; nextPlan: string; dietAdvice: string }>({
      model: process.env.KIMI_MODEL_SUMMARY || "moonshot-v1-8k",
      messages: [{ role: "system", content: "你只能输出 JSON。" }, { role: "user", content: prompt }],
    });

    return {
      summary: typeof parsed.summary === "string" ? parsed.summary : fallbackSessionSummary(input).summary,
      nextPlan: typeof parsed.nextPlan === "string" ? parsed.nextPlan : fallbackSessionSummary(input).nextPlan,
      dietAdvice: typeof parsed.dietAdvice === "string" ? parsed.dietAdvice : fallbackSessionSummary(input).dietAdvice,
      source: "kimi",
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // debug：Kimi失败时仍保证功能可用
    console.warn("[AI][session-summary] Kimi 调用失败，已降级 fallback：", msg);
    return fallbackSessionSummary(input);
  }
}

export async function generateTrainPlan(input: GeneratePlanInput): Promise<GeneratePlanOutput> {
  const apiKey = getKimiApiKey();
  if (!apiKey) {
    console.warn("[AI][generate-plan] KIMI_API_KEY 未配置，已降级 fallback");
    return fallbackPlan(input);
  }

  const { weight, bodyFat, muscleMass, goal, experience } = input;

  const prompt = [
    "你是一名专业健身教练。",
    "根据学员身体数据与目标生成一周训练计划。",
    "输出必须严格为 JSON，不要输出任何多余文字。",
    "JSON 格式：",
    "{",
    '  "weeklyPlan": [',
    '    { "day": "周一/周二...", "workouts": [ {"action": "动作名", "sets": 数字, "reps": 数字} ], "notes": "可选说明" }',
    "  ],",
    '  "tips": "训练要点（字符串）",',
    '  "diet": "饮食建议（字符串）"',
    "}",
    "约束：",
    "- weeklyPlan 必须包含 7 天（周一到周日）。",
    "- workouts 至少包含 3 个动作（休息/轻松日除外）。",
    `学员数据：体重=${weight}kg，体脂=${bodyFat}%，肌肉量/骨骼肌量=${muscleMass}（数值以输入为准）。`,
    `目标：${goal}；经验：${experience}。`,
    "动作建议要覆盖：主项（力量/深蹲硬拉推拉等）+ 核心稳定 + 辅助拉伸。",
  ].join("\n");

  try {
    const parsed = await callKimiJson<any>({
      model: process.env.KIMI_MODEL_PLAN || "moonshot-v1-32k",
      messages: [{ role: "system", content: "你只能输出 JSON。" }, { role: "user", content: prompt }],
    });

    // Basic shape validation + normalization.
    if (!parsed || !Array.isArray(parsed.weeklyPlan)) return fallbackPlan(input);
    const weeklyPlan = parsed.weeklyPlan.slice(0, 7).map((d: any) => ({
      day: typeof d.day === "string" ? d.day : "",
      workouts: Array.isArray(d.workouts)
        ? d.workouts.map((w: any) => ({
            action: typeof w.action === "string" ? w.action : "",
            sets: typeof w.sets === "number" ? w.sets : parseInt(String(w.sets || 0), 10) || 0,
            reps: typeof w.reps === "number" ? w.reps : parseInt(String(w.reps || 0), 10) || 0,
          }))
        : [],
      notes: typeof d.notes === "string" ? d.notes : undefined,
    }));

    // Ensure 7 days
    while (weeklyPlan.length < 7) {
      weeklyPlan.push({ day: ["周一", "周二", "周三", "周四", "周五", "周六", "周日"][weeklyPlan.length], workouts: [] });
    }

    const out: GeneratePlanOutput = {
      weeklyPlan,
      tips: typeof parsed.tips === "string" ? parsed.tips : fallbackPlan(input).tips,
      diet: typeof parsed.diet === "string" ? parsed.diet : fallbackPlan(input).diet,
    };
    // Clamp workout sets/reps to positive integers.
    out.weeklyPlan = out.weeklyPlan.map((d) => ({
      ...d,
      workouts: (d.workouts || []).map((w) => ({
        ...w,
        sets: Math.max(0, Math.floor(w.sets)),
        reps: Math.max(0, Math.floor(w.reps)),
      })),
    }));
    return out;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn("[AI][generate-plan] Kimi 调用失败，已降级 fallback：", msg);
    return fallbackPlan(input);
  }
}

