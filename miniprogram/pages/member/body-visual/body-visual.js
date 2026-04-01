/**
 * 体型展示：2D 轮廓示意（body-silhouette），由围度/体脂驱动；不做 WebGL 积木人。
 * 女性胸围展示用固定 88cm；男性用实测胸围。
 */
const api = require("../../../utils/api.js");

const FEMALE_CHEST_DISPLAY = 88;

function mapGender(g) {
  const s = String(g || "").trim();
  if (s === "女" || s === "female" || s === "f" || s === "F") return "女";
  return "男";
}

Page({
  data: {
    gender: "男",
    waist: 80,
    hip: 95,
    chest: 98,
    bodyFat: 18,
    fatLevel: 0.4,
    muscleLevel: 0.5,
    loaded: false,
  },
  async onShow() {
    try {
      const res = await api.bodyMine();
      const list = (res.data || []).slice().sort((a, b) => new Date(b.recordDate) - new Date(a.recordDate));
      const latest = list[0];
      if (latest && res.ok) {
        const g = mapGender(latest.gender);
        const bodyFat = latest.bodyFat;
        const skeletalMuscle = latest.skeletalMuscle;
        const fatLevel = bodyFat != null ? Math.min(1, Math.max(0, (Number(bodyFat) - 10) / 25)) : 0.4;
        const muscleLevel =
          skeletalMuscle != null ? Math.min(1, Math.max(0, (Number(skeletalMuscle) - 20) / 25)) : 0.5;
        const chestRaw = latest.chest != null ? Number(latest.chest) : 98;
        const chestDisplay = g === "女" ? FEMALE_CHEST_DISPLAY : chestRaw;
        this.setData({
          gender: g,
          waist: latest.waist != null ? Number(latest.waist) : 80,
          hip: latest.hip != null ? Number(latest.hip) : 95,
          chest: chestDisplay,
          bodyFat: latest.bodyFat != null ? Number(latest.bodyFat) : 18,
          fatLevel,
          muscleLevel,
          loaded: true,
        });
      } else {
        this.setData({ loaded: true });
      }
    } catch (e) {
      wx.showToast({ title: e.message || "加载失败", icon: "none" });
      this.setData({ loaded: true });
    }
  },
});
