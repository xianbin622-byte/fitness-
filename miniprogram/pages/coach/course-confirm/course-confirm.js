const api = require("../../../utils/api.js");

Page({
  data: { rec: null, id: "" },
  async onLoad(q) {
    const id = q.id;
    if (!id) return;
    this.setData({ id });
    try {
      const res = await api.courseDetail(id);
      if (res.ok) this.setData({ rec: res.data });
    } catch (e) {
      wx.showToast({ title: e.message || "加载失败", icon: "none" });
    }
  },
  onSum(e) {
    const rec = { ...this.data.rec, summary: e.detail.value };
    this.setData({ rec });
  },
  onNext(e) {
    const rec = { ...this.data.rec, nextCoursePlan: e.detail.value };
    this.setData({ rec });
  },
  onDiet(e) {
    const rec = { ...this.data.rec, dietAdvice: e.detail.value };
    this.setData({ rec });
  },
  async onConfirm() {
    const { id, rec } = this.data;
    if (!rec) return;
    try {
      const res = await api.courseConfirm(id, {
        summary: rec.summary,
        nextCoursePlan: rec.nextCoursePlan,
        dietAdvice: rec.dietAdvice,
        coachNotes: rec.coachNotes,
      });
      if (!res.ok) throw new Error(res.message);
      wx.showToast({ title: "已确认", icon: "success" });
      setTimeout(() => {
        wx.redirectTo({ url: "/pages/coach/home/home" });
      }, 400);
    } catch (e) {
      wx.showToast({ title: e.message || "失败", icon: "none" });
    }
  },
});
