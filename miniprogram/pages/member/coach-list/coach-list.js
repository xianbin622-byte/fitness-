const api = require("../../../utils/api.js");
const app = getApp();

Page({
  data: { list: [] },
  onLoad(q) {
    if (q && q.fromOnboarding) {
      wx.showToast({ title: "可在此选择并绑定教练", icon: "none" });
    }
  },
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
