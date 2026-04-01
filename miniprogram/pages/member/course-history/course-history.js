const api = require("../../../utils/api.js");

Page({
  data: { list: [] },
  async onShow() {
    try {
      const res = await api.courseMine();
      const raw = res.data || [];
      const list = raw.map((r) => ({
        ...r,
        createdAt: String(r.createdAt).replace("T", " ").slice(0, 16),
      }));
      if (res.ok) this.setData({ list });
    } catch (e) {
      wx.showToast({ title: e.message || "加载失败", icon: "none" });
    }
  },
});
