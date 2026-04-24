/** 排课模板：与后端 slotKind / theme / maxBookings 对应；category 对齐 Figma 课程类型展示 */
const CLASS_PRESETS = [
  { title: "运动康复", slotKind: "COURSE", theme: "fitness", maxBookings: 8, category: "康复" },
  { title: "私教1:1", slotKind: "PRIVATE", theme: "private", maxBookings: 1, category: "私教" },
  { title: "普拉提", slotKind: "COURSE", theme: "pilates", maxBookings: 8, category: "普拉提" },
];

/** WXML 用 theme 类名后缀 */
const THEME_CLASS = {
  pilates: "pilates",
  mat: "mat",
  fitness: "fitness",
  yoga: "yoga",
  private: "private",
  default: "default",
};

function themeClass(theme) {
  return THEME_CLASS[theme] || "default";
}

module.exports = { CLASS_PRESETS, themeClass };
