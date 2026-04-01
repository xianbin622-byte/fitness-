const api = require("../../../utils/api.js");

Page({
  data: { list: [] },
  async onShow() {
    try {
      const res = await api.bodyMine();
      const raw = res.data || [];
      const list = raw.map((r) => ({
        ...r,
        recordDateStr: String(r.recordDate).slice(0, 10),
      }));
      if (res.ok) this.setData({ list });
    } catch (e) {
      wx.showToast({ title: e.message || "加载失败", icon: "none" });
    }
  },
});
