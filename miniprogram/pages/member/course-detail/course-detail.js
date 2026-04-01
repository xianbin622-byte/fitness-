const api = require("../../../utils/api.js");

Page({
  data: { rec: null },
  async onLoad(q) {
    const id = q.id;
    if (!id) return;
    try {
      const res = await api.courseDetail(id);
      if (res.ok) this.setData({ rec: res.data });
    } catch (e) {
      wx.showToast({ title: e.message || "加载失败", icon: "none" });
    }
  },
});
