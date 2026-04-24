const app = getApp();

function safeReLaunch(page, url) {
  if (!url || page.__jumping) return;
  page.__jumping = true;
  setTimeout(() => {
    wx.reLaunch({ url, complete: () => { page.__jumping = false; } });
  }, 30);
}

Page({
  data: {
    user: null,
    isMember: false,
    isCoach: false,
    roleText: "",
  },
  onShow() {
    const user = app.globalData.user || wx.getStorageSync("user");
    if (user && user.role === "COACH") {
      safeReLaunch(this, "/pages/coach/home/home");
      return;
    }
    if (user && user.role === "MEMBER") {
      if (!user.memberProfileAt) safeReLaunch(this, "/pages/member/onboarding/onboarding");
      else safeReLaunch(this, "/pages/member/home/home");
      return;
    }
    const isMember = user && user.role === "MEMBER";
    const isCoach = user && user.role === "COACH";
    let roleText = "未登录";
    if (user) roleText = user.role === "MEMBER" ? "会员" : "教练";
    this.setData({ user, isMember, isCoach, roleText });
  },
  goLogin() {
    wx.navigateTo({ url: "/pages/entry/role-select/role-select" });
  },
  goMember() {
    if (this.data.user && !this.data.isMember) return;
    wx.navigateTo({ url: "/pages/member/home/home" });
  },
  goCoach() {
    if (this.data.user && !this.data.isCoach) return;
    wx.navigateTo({ url: "/pages/coach/home/home" });
  },
  logout() {
    app.globalData.token = "";
    app.globalData.user = null;
    wx.removeStorageSync("token");
    wx.removeStorageSync("user");
    this.onShow();
    wx.showToast({ title: "已退出", icon: "success" });
  },
});
