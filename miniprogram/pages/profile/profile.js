const app = getApp();

Page({
  data: { user: null },
  onShow() {
    this.setData({ user: app.globalData.user || wx.getStorageSync("user") });
  },
  logout() {
    app.clearSession();
    wx.showToast({ title: "已退出", icon: "success" });
    wx.reLaunch({ url: "/pages/login/login" });
  },
});
