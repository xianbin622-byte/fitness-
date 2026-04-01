const api = require("../../../utils/api.js");

Page({
  data: { advice: { nextCoursePlan: "", summary: null } },
  async onShow() {
    try {
      const res = await api.nextAdvice();
      if (res.ok) this.setData({ advice: res.data });
    } catch (e) {
      wx.showToast({ title: e.message || "加载失败", icon: "none" });
    }
  },
});
