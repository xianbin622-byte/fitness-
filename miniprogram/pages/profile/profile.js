const app = getApp();

Page({
  data: { user: null },
  onShow() {
    const u = app.globalData.user || wx.getStorageSync("user");
    if (u && u.role === "MEMBER" && !u.memberProfileAt) {
      wx.reLaunch({ url: "/pages/member/onboarding/onboarding" });
      return;
    }
    this.setData({ user: u });
  },
  onMemTab(e) {
    const t = e.currentTarget.dataset.t;
    if (t === "mine") return;
    if (t === "home") wx.reLaunch({ url: "/pages/member/home/home" });
    if (t === "book") wx.reLaunch({ url: "/pages/member/booking-center/booking-center" });
  },
  logout() {
    app.clearSession();
    wx.showToast({ title: "已退出", icon: "success" });
    wx.reLaunch({ url: "/pages/entry/role-select/role-select" });
  },
});
