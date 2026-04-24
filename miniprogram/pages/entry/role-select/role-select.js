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
    statusBarH: 0,
    selectedRole: "MEMBER",
  },
  onLoad() {},
  onShow() {
    const token = app.globalData.token || wx.getStorageSync("token");
    const user = app.globalData.user || wx.getStorageSync("user");
    if (token && user && user.role === "COACH") {
      safeReLaunch(this, "/pages/coach/home/home");
      return;
    }
    if (token && user && user.role === "MEMBER") {
      // 会员资料未完善时，允许停留在角色首页，避免点击系统“小房子”后又被瞬间拉回导致“看起来不跳转”
      if (user.memberProfileAt) safeReLaunch(this, "/pages/member/home/home");
    }
  },
  selectRole(e) {
    const role = e.currentTarget.dataset.role;
    if (role !== "MEMBER" && role !== "COACH") return;
    this.setData({ selectedRole: role });
  },
  /** 选角后进入注册页（第二步），非登录页 */
  goRegister() {
    const role = this.data.selectedRole;
    if (role !== "MEMBER" && role !== "COACH") return;
    wx.navigateTo({ url: `/pages/register/register?role=${role}` });
  },
});
