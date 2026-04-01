const api = require("../../../utils/api.js");

function todayStr() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return d.getFullYear() + "-" + m + "-" + day;
}

Page({
  data: { date: todayStr() },
  onDate(e) {
    this.setData({ date: e.detail.value });
  },
  async onClose() {
    try {
      const res = await api.closeDay(this.data.date);
      if (!res.ok) throw new Error(res.message);
      wx.showToast({ title: "已关闭", icon: "success" });
    } catch (e) {
      wx.showToast({ title: e.message || "失败", icon: "none" });
    }
  },
  async onOpen() {
    try {
      const res = await api.openDay(this.data.date);
      if (!res.ok) throw new Error(res.message);
      wx.showToast({ title: "已开放", icon: "success" });
    } catch (e) {
      wx.showToast({ title: e.message || "失败", icon: "none" });
    }
  },
});
