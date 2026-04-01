const api = require("../../../utils/api.js");

Page({
  data: { text: "暂无" },
  async onLoad(q) {
    const memberId = q.memberId;
    if (!memberId) return;
    try {
      const res = await api.courseLatestForMember(memberId);
      if (res.ok && res.data && res.data.nextCoursePlan) {
        this.setData({ text: res.data.nextCoursePlan });
      }
    } catch (e) {
      wx.showToast({ title: e.message || "加载失败", icon: "none" });
    }
  },
});
