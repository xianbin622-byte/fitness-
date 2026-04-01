const api = require("../../../utils/api.js");

function calcFallbackExperience() {
  return "中级";
}

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

Page({
  data: {
    weight: "",
    bodyFat: "",
    muscleMass: "",
    goalIndex: 0,
    expIndex: 1,
    goalOptions: ["增肌", "减脂", "维持"],
    expOptions: ["初级", "中级", "高级"],
    loading: false,
    result: null,
    tips: "",
    diet: "",
    weeklyPlan: [],
  },

  async onShow() {
    const u = getApp().globalData.user;
    if (!u || u.role !== "MEMBER") {
      wx.showModal({
        title: "提示",
        content: "请以会员身份登录",
        success: (r) => {
          if (r.confirm) wx.reLaunch({ url: "/pages/login/login" });
        },
      });
      return;
    }
    await this.loadLatestBody();
  },

  async loadLatestBody() {
    try {
      const res = await api.bodyMine();
      const raw = res.data || [];
      const list = raw.slice().sort((a, b) => new Date(b.recordDate) - new Date(a.recordDate));
      const latest = list[0];
      if (!latest) return;

      this.setData({
        weight: latest.weight != null ? String(latest.weight) : "",
        bodyFat: latest.bodyFat != null ? String(latest.bodyFat) : "",
        muscleMass: latest.skeletalMuscle != null ? String(latest.skeletalMuscle) : "",
      });
    } catch (e) {
      wx.showToast({ title: e.message || "加载身体数据失败", icon: "none" });
    }
  },

  onGoal(e) {
    this.setData({ goalIndex: Number(e.detail.value) });
  },

  onExp(e) {
    this.setData({ expIndex: Number(e.detail.value) });
  },

  async onGenerate() {
    const weight = toNum(this.data.weight);
    const bodyFat = toNum(this.data.bodyFat);
    // skeleton muscle / muscleMass（MVP：用骨骼肌量近似）
    const muscleMass = toNum(this.data.muscleMass);
    const goal = this.data.goalOptions[this.data.goalIndex];
    const experience = this.data.expOptions[this.data.expIndex] || calcFallbackExperience();

    if (!Number.isFinite(weight) || !Number.isFinite(bodyFat) || !Number.isFinite(muscleMass)) {
      wx.showToast({ title: "请先录入身体数据（含体脂与骨骼肌量）", icon: "none" });
      return;
    }

    this.setData({ loading: true });
    try {
      const res = await api.generateTrainPlan({
        weight,
        bodyFat,
        muscleMass,
        goal,
        experience,
      });
      if (!res.ok) throw new Error(res.message || "生成失败");
      const data = res.data || {};
      this.setData({
        result: data,
        tips: data.tips || "",
        diet: data.diet || "",
        weeklyPlan: data.weeklyPlan || [],
      });
    } catch (e) {
      wx.showToast({ title: e.message || "生成失败", icon: "none" });
    } finally {
      this.setData({ loading: false });
    }
  },
});

