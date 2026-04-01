/**
 * 将日期 (YYYY-MM-DD) 与时间 (HH:mm) 转为本地 Date，用于取消规则校验
 */
export function combineDateAndTime(dateStr: string, timeStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = timeStr.split(":").map(Number);
  return new Date(y, m - 1, d, hh, mm, 0, 0);
}

/** 距离开课是否不足 1 小时（不可取消） */
export function isWithinOneHourBeforeClass(startAt: Date, now: Date = new Date()): boolean {
  const diffMs = startAt.getTime() - now.getTime();
  return diffMs < 60 * 60 * 1000;
}

export function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
