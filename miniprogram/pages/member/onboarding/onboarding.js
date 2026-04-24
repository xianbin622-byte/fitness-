const api = require("../../../utils/api.js");
const app = getApp();

function todayStr() {
  const t = new Date();
  return (
    t.getFullYear() +
    "-" +
    String(t.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(t.getDate()).padStart(2, "0")
  );
}

Page({
  data: {
    genderLabels: ["男", "女", "不公开"],
    genderValues: ["MALE", "FEMALE", "UNSPECIFIED"],
    genderIndex: 0,
    today: todayStr(),
    heightCm: "",
    weightKg: "",
    bodyFatPct: "",
    skeletalMusclePct: "",
    waistCm: "",
    hipCm: "",
    whr: "",
    birthday: "",
    exercisePreference: "",
    submitting: false,
  },
  onGender(e) {
    const i = Number(e.detail.value);
    if (!isNaN(i)) this.setData({ genderIndex: i });
  },
  onShow() {
    const u = app.globalData.user || wx.getStorageSync("user");
    if (!u || u.role !== "MEMBER") {
      wx.reLaunch({ url: "/pages/entry/role-select/role-select" });
    }
  },
  onHeight(e) {
    this.setData({ heightCm: e.detail.value });
  },
  onWeight(e) {
    this.setData({ weightKg: e.detail.value });
  },
  onFat(e) {
    this.setData({ bodyFatPct: e.detail.value });
  },
  onMuscle(e) {
    this.setData({ skeletalMusclePct: e.detail.value });
  },
  onWaist(e) {
    this.setData({ waistCm: e.detail.value }, () => this.updateWhr());
  },
  onHip(e) {
    this.setData({ hipCm: e.detail.value }, () => this.updateWhr());
  },
  updateWhr() {
    const w = parseFloat(this.data.waistCm);
    const h = parseFloat(this.data.hipCm);
    if (w > 0 && h > 0) {
      this.setData({ whr: (w / h).toFixed(2) });
    } else {
      this.setData({ whr: "" });
    }
  },
  onBirth(e) {
    this.setData({ birthday: e.detail.value || "" });
  },
  onPref(e) {
    this.setData({ exercisePreference: e.detail.value });
  },
  async onSubmit() {
    const h = parseFloat(this.data.heightCm);
    const w = parseFloat(this.data.weightKg);
    if (!h || h < 100 || h > 250) {
      wx.showToast({ title: "请填写有效身高（cm）", icon: "none" });
      return;
    }
    if (!w || w < 30 || w > 300) {
      wx.showToast({ title: "请填写有效体重（kg）", icon: "none" });
      return;
    }
    this.setData({ submitting: true });
    try {
      const gi = this.data.genderIndex;
      const gender = (this.data.genderValues && this.data.genderValues[gi]) || "UNSPECIFIED";
      const body = {
        gender,
        heightCm: h,
        weightKg: w,
        bodyFatPct: this.data.bodyFatPct ? parseFloat(this.data.bodyFatPct) : undefined,
        skeletalMusclePct: this.data.skeletalMusclePct
          ? parseFloat(this.data.skeletalMusclePct)
          : undefined,
        waistCm: this.data.waistCm ? parseFloat(this.data.waistCm) : undefined,
        hipCm: this.data.hipCm ? parseFloat(this.data.hipCm) : undefined,
        birthday: this.data.birthday || undefined,
        exercisePreference: (this.data.exercisePreference || "").trim() || undefined,
      };
      const res = await api.saveMemberProfile(body);
      if (!res.ok) throw new Error(res.message || "保存失败");
      const u = { ...(app.globalData.user || {}), ...(res.data || {}) };
      app.setSession(app.globalData.token, u);
      wx.showToast({ title: "已保存", icon: "success" });
      wx.reLaunch({ url: "/pages/member/coach-list/coach-list?fromOnboarding=1" });
    } catch (e) {
      wx.showToast({ title: e.message || "失败", icon: "none" });
    } finally {
      this.setData({ submitting: false });
    }
  },
});
