const api = require("../../../utils/api.js");

Page({
  data: { text: "" },
  async onShow() {
    try {
      const res = await api.nextAdvice();
      if (res.ok) this.setData({ text: res.data.dietAdvice || "" });
    } catch (e) {
      wx.showToast({ title: e.message || "加载失败", icon: "none" });
    }
  },
});
