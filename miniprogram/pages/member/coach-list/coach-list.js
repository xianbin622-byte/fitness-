const api = require("../../../utils/api.js");

Page({
  data: { list: [] },
  async onShow() {
    try {
      const res = await api.coachList();
      if (res.ok) {
        const list = (res.data || []).map((x) => ({
          ...x,
          avatarText: (x.nickname || "教").slice(0, 1),
        }));
        this.setData({ list });
      }
    } catch (e) {
      wx.showToast({ title: e.message || "加载失败", icon: "none" });
    }
  },
  async onBind(e) {
    const coachId = e.currentTarget.dataset.id;
    try {
      const res = await api.bindCoach(coachId);
      if (!res.ok) throw new Error(res.message);
      wx.showToast({ title: "绑定成功", icon: "success" });
      wx.navigateTo({ url: "/pages/member/coach-detail/coach-detail?coachId=" + coachId });
    } catch (err) {
      wx.showToast({ title: err.message || "绑定失败", icon: "none" });
    }
  },
});
