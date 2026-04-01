type TrainingPlanInput = {
  gender?: string | null;
  age?: number | null;
  height?: number | null;
  weight?: number | null;
  bodyFat?: number | null;
  goal: string;
  recentNotes?: string | null;
};

type TrainingPlanOutput = {
  trainingPlan: string;
  dietAdvice: string;
  riskNote: string;
};

const KIMI_BASE_URL = process.env.KIMI_BASE_URL || "https://api.moonshot.cn/v1";
const KIMI_MODEL = process.env.KIMI_MODEL_PLAN || "moonshot-v1-8k";

function fallbackPlan(input: TrainingPlanInput): TrainingPlanOutput {
  const goal = input.goal || "维持";
  return {
    trainingPlan:
      goal === "减脂"
        ? "每周4天训练：2天力量(深蹲/硬拉/卧推各4组8-12次)+2天有氧(30-40分钟中等强度快走或骑行)。"
        : goal === "增肌"
          ? "每周5天训练：胸背腿肩臂分化，核心动作4-5组6-12次，逐周增加负重。"
          : "每周3-4天全身训练：复合动作为主，每次45-60分钟，强度中等。",
    dietAdvice:
      goal === "减脂"
        ? "每日蛋白质约1.6-2.0g/kg体重，控制精制碳水，晚餐减少油脂并保证蔬菜摄入。"
        : goal === "增肌"
          ? "每日蛋白质约1.8-2.2g/kg体重，训练前后补充碳水，保证总热量小幅盈余。"
          : "蛋白质保持1.6-2.0g/kg体重，主食粗细搭配，避免高糖饮料。",
    riskNote: "若有膝盖或腰部不适，优先降低负重并调整动作轨迹，必要时暂停相关动作。",
  };
}

function stripFence(text: string): string {
  return text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
}

export async function generateTrainingPlan(input: TrainingPlanInput): Promise<TrainingPlanOutput> {
  const apiKey = (process.env.KIMI_API_KEY || "").trim();
  if (!apiKey) return fallbackPlan(input);

  const systemPrompt = [
    "你是专业健身教练，基于以下用户数据生成科学训练计划：",
    "- 训练要具体（动作 + 组数 + 次数）",
    "- 饮食要具体（蛋白/碳水建议）",
    "- 风险提示（如膝盖、腰）",
    "输出必须是 JSON，不要多余解释",
    'JSON 格式固定为：{"trainingPlan":"", "dietAdvice":"", "riskNote":""}',
  ].join("\n");

  const userPrompt = JSON.stringify(
    {
      gender: input.gender ?? null,
      age: input.age ?? null,
      height: input.height ?? null,
      weight: input.weight ?? null,
      bodyFat: input.bodyFat ?? null,
      goal: input.goal,
      recentNotes: input.recentNotes ?? "",
    },
    null,
    2
  );

  try {
    const response = await fetch(`${KIMI_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: KIMI_MODEL,
        temperature: 0.3,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) return fallbackPlan(input);
    const data = (await response.json()) as any;
    const content = data?.choices?.[0]?.message?.content;
    if (!content || typeof content !== "string") return fallbackPlan(input);

    const parsed = JSON.parse(stripFence(content));
    if (!parsed?.trainingPlan || !parsed?.dietAdvice || !parsed?.riskNote) return fallbackPlan(input);

    return {
      trainingPlan: String(parsed.trainingPlan),
      dietAdvice: String(parsed.dietAdvice),
      riskNote: String(parsed.riskNote),
    };
  } catch {
    return fallbackPlan(input);
  }
}

export type { TrainingPlanInput, TrainingPlanOutput };
