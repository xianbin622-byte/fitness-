const app = getApp();

Page({
  data: {},
  onShow() {
    const u = app.globalData.user || wx.getStorageSync("user");
    if (u && u.role === "MEMBER" && !u.memberProfileAt) {
      wx.reLaunch({ url: "/pages/member/onboarding/onboarding" });
    }
  },
  onTabSwitch(e) {
    const t = e.currentTarget.dataset.t;
    if (t === "book") return;
    if (t === "home") wx.reLaunch({ url: "/pages/member/home/home" });
    if (t === "mine") wx.reLaunch({ url: "/pages/member/mine/mine" });
  },
});
