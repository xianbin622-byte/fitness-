const api = require("../../../utils/api.js");
const app = getApp();

Page({
  data: { list: [] },
  onTabSwitch(e) {
    const t = e.currentTarget.dataset.t;
    if (t === "book") {
      wx.reLaunch({ url: "/pages/member/booking-center/booking-center" });
      return;
    }
    if (t === "home") wx.reLaunch({ url: "/pages/member/home/home" });
    if (t === "mine") wx.reLaunch({ url: "/pages/member/mine/mine" });
  },
  async onShow() {
    const u = app.globalData.user || wx.getStorageSync("user");
    if (u && u.role === "MEMBER" && !u.memberProfileAt) {
      wx.reLaunch({ url: "/pages/member/onboarding/onboarding" });
      return;
    }
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
