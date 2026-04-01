const app = getApp();

Page({
  data: {
    user: null,
    isMember: false,
    isCoach: false,
    roleText: "",
  },
  onShow() {
    const user = app.globalData.user || wx.getStorageSync("user");
    const isMember = user && user.role === "MEMBER";
    const isCoach = user && user.role === "COACH";
    let roleText = "未登录";
    if (user) roleText = user.role === "MEMBER" ? "会员" : "教练";
    this.setData({ user, isMember, isCoach, roleText });
  },
  goLogin() {
    wx.navigateTo({ url: "/pages/login/login" });
  },
});
