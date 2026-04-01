/**
 * MVP 规则引擎：根据身体数据、闪记、问题点生成总结与建议
 * 预留：后续可替换为 LLM 服务，保持函数签名不变
 */

export type FlashExercise = {
  actionName: string;
  weight?: number | null;
  reps?: number | null;
  sets?: number | null;
  notes?: string | null;
};

export type FlashPayload = {
  issues?: string;
  coachNotes?: string;
  exercises: FlashExercise[];
};

export type BodySnapshot = {
  weight?: number | null;
  bodyFat?: number | null;
  waist?: number | null;
};

/** 生成课程总结草稿 */
export function generateSummaryDraft(flash: FlashPayload): string {
  const lines: string[] = [];
  lines.push("【本节课训练概要】");
  if (flash.exercises?.length) {
    flash.exercises.forEach((e, i) => {
      const parts = [e.actionName];
      if (e.weight != null) parts.push(`重量 ${e.weight}kg`);
      if (e.reps != null) parts.push(`${e.reps} 次`);
      if (e.sets != null) parts.push(`${e.sets} 组`);
      lines.push(`${i + 1}. ${parts.join("，")}${e.notes ? `（${e.notes}）` : ""}`);
    });
  } else {
    lines.push("（尚未记录动作明细，可在确认页补充）");
  }
  if (flash.issues?.trim()) {
    lines.push("");
    lines.push("【问题与注意】");
    lines.push(flash.issues.trim());
  }
  if (flash.coachNotes?.trim()) {
    lines.push("");
    lines.push("【教练备注】");
    lines.push(flash.coachNotes.trim());
  }
  return lines.join("\n");
}

/** 根据问题点与动作生成下次课程建议 */
export function generateNextCourseAdvice(flash: FlashPayload, body?: BodySnapshot): string {
  const tips: string[] = [];
  const issue = (flash.issues || "").toLowerCase();

  if (/膝|膝盖|下蹲|蹲/.test(issue) || /膝/.test(flash.coachNotes || "")) {
    tips.push("下次课程：加强膝关节稳定与臀中肌激活，可安排箱式深蹲、弹力带侧向行走等低冲击动作。");
  }
  if (/腰|核心|腹/.test(issue)) {
    tips.push("下次课程：增加核心抗伸展/抗侧屈训练，如死虫、Pallof  press、侧平板支撑。");
  }
  if (/肩|圆肩/.test(issue)) {
    tips.push("下次课程：安排肩胛后缩与胸椎灵活性练习，再上推类动作。");
  }
  if (/下肢|腿|臀/.test(issue) && !tips.length) {
    tips.push("下次课程：在热身充分前提下，逐步增加下肢基础力量（深蹲/硬拉变式）容量。");
  }

  const names = (flash.exercises || []).map((e) => e.actionName).join(" ");
  if (/深蹲|硬拉|腿/.test(names) && !tips.some((t) => t.includes("下肢"))) {
    tips.push("下次课程：可尝试在下肢主项上小幅递增负荷或组数，注意动作幅度与节奏。");
  }

  if (body?.bodyFat != null && body.bodyFat > 22) {
    tips.push("结合当前体脂偏高，下次可穿插代谢训练片段并监控心率区间。");
  }
  if (body?.bodyFat != null && body.bodyFat <= 15) {
    tips.push("体脂控制良好，下次可侧重力量周期或专项技术细节。");
  }

  if (!tips.length) {
    tips.push("下次课程：延续本节课主项，逐步递增训练量；根据恢复情况调整组间歇与辅助项。");
  }
  return tips.join("\n");
}

/** 根据身体数据生成饮食注意事项（规则版） */
export function generateDietAdvice(body?: BodySnapshot): string {
  const lines: string[] = [];
  if (body?.bodyFat != null && body.bodyFat > 25) {
    lines.push("控制油脂与添加糖，优先高蛋白、足量蔬菜；晚餐适量减少精制碳水。");
  } else if (body?.bodyFat != null && body.bodyFat > 18) {
    lines.push("保持热量轻微缺口或维持：注意隐形热量（饮料、酱料），蛋白质每公斤体重约 1.6–2.0g。");
  } else {
    lines.push("均衡饮食：每餐优先蛋白质与蔬菜，训练日可适当增加优质碳水支持恢复。");
  }
  if (body?.weight != null && body?.waist != null) {
    lines.push("建议固定每周同一时间空腹称重、量腰围，便于对比趋势。");
  }
  lines.push("（后续可接入个性化营养方案或 AI 建议）");
  return lines.join("\n");
}
