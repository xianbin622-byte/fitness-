const api = require("../../../utils/api.js");

Page({
  data: { list: [] },
  async onShow() {
    try {
      const res = await api.coachMembers();
      if (res.ok) this.setData({ list: res.data || [] });
    } catch (e) {
      wx.showToast({ title: e.message || "加载失败", icon: "none" });
    }
  },
});
