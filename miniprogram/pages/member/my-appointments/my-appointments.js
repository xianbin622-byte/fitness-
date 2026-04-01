const api = require("../../../utils/api.js");

Page({
  data: { list: [] },
  async onShow() {
    try {
      const res = await api.myAppointments();
      if (res.ok) this.setData({ list: res.data || [] });
    } catch (e) {
      wx.showToast({ title: e.message || "加载失败", icon: "none" });
    }
  },
  async onCancel(e) {
    const id = e.currentTarget.dataset.id;
    try {
      const res = await api.cancelAppointment(id);
      if (!res.ok) throw new Error(res.message);
      wx.showToast({ title: "已取消", icon: "success" });
      this.onShow();
    } catch (err) {
      wx.showToast({ title: err.message || "取消失败", icon: "none" });
    }
  },
});
