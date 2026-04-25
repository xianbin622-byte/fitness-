const api = require("../../utils/api.js");
const app = getApp();
const isBackendUnavailable = (msg = "") =>
  /connection refused|err_connection_refused|127\.0\.0\.1:3000|无法连接服务器|timeout|请求超时/i.test(msg);
const getHomeByRole = (user) =>
  user && user.role === "COACH" ? "/pages/coach/home/home" : "/pages/member/home/home";

function afterAuthEntryPath(user) {
  if (user && user.role === "COACH") return "/pages/coach/home/home";
  if (user && user.role === "MEMBER" && !user.memberProfileAt) {
    return "/pages/member/onboarding/onboarding";
  }
  if (user && user.role === "MEMBER") return "/pages/member/home/home";
  return getHomeByRole(user);
}

Page({
  data: {
    roles: [
      { label: "会员", value: "MEMBER" },
      { label: "教练", value: "COACH" },
    ],
    roleIndex: 0,
    nickname: "",
    email: "",
    smsCode: "",
    countdown: 0,
    statusBarH: 0,
    roleFromEntry: false,
  },
  _smsTimer: null,
  onLoad(query) {
    const r = query && query.role;
    if (r === "COACH") {
      this.setData({ roleIndex: 1, roleFromEntry: true });
    } else if (r === "MEMBER") {
      this.setData({ roleIndex: 0, roleFromEntry: true });
    }
  },
  onUnload() {
    if (this._smsTimer) clearInterval(this._smsTimer);
  },
  noop() {},
  onRole(e) {
    this.setData({ roleIndex: Number(e.detail.value) });
  },
  onNick(e) {
    this.setData({ nickname: e.detail.value });
  },
  onEmail(e) {
    this.setData({ email: e.detail.value });
  },
  onSms(e) {
    this.setData({ smsCode: e.detail.value });
  },
  startCountdown() {
    if (this._smsTimer) clearInterval(this._smsTimer);
    let n = 60;
    this.setData({ countdown: n });
    this._smsTimer = setInterval(() => {
      n -= 1;
      if (n <= 0) {
        clearInterval(this._smsTimer);
        this._smsTimer = null;
        this.setData({ countdown: 0 });
      } else {
        this.setData({ countdown: n });
      }
    }, 1000);
  },
  async sendEmailCode() {
    const { email, countdown } = this.data;
    if (countdown > 0) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((email || "").trim())) {
      wx.showToast({ title: "请填写有效邮箱", icon: "none" });
      return;
    }
    wx.showLoading({ title: "发送中" });
    try {
      const res = await api.sendEmailCode({
        email: (email || "").trim(),
      });
      if (!res.ok) throw new Error(res.message || "失败");
      if (res.debugCode) {
        wx.showModal({
          title: "开发环境",
          content: `验证码：${res.debugCode}\n（生产环境请配置 SMTP 发信）`,
          showCancel: false,
        });
      } else {
        wx.showToast({ title: "验证码已发送", icon: "success" });
      }
      this.startCountdown();
    } catch (e) {
      const msg = e.message || "注册失败";
      if (isBackendUnavailable(msg)) {
        wx.showToast({ title: "后端未连接", icon: "none" });
      } else {
        wx.showToast({ title: msg, icon: "none" });
      }
    } finally {
      wx.hideLoading();
    }
  },
  async onReg() {
    const { roles, roleIndex, nickname, email, smsCode } = this.data;
    if (!(nickname || "").trim()) {
      wx.showToast({ title: "请填写昵称", icon: "none" });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((email || "").trim())) {
      wx.showToast({ title: "请填写有效邮箱", icon: "none" });
      return;
    }
    if (!String(smsCode || "").trim()) {
      wx.showToast({ title: "请填写验证码", icon: "none" });
      return;
    }
    wx.showLoading({ title: "注册中" });
    try {
      const res = await api.register({
        nickname: (nickname || "").trim(),
        email: (email || "").trim(),
        smsCode: String(smsCode || "").trim(),
        role: roles[roleIndex].value,
      });
      if (!res.ok) throw new Error(res.message || "注册失败");
      app.setSession(res.data.token, res.data.user);
      wx.showToast({ title: "注册成功", icon: "success" });
      wx.reLaunch({ url: afterAuthEntryPath(app.globalData.user || wx.getStorageSync("user")) });
    } catch (e) {
      wx.showToast({ title: e.message || "注册失败", icon: "none" });
    } finally {
      wx.hideLoading();
    }
  },
  goBack() {
    wx.navigateBack({
      fail: () =>
        wx.redirectTo({ url: "/pages/entry/role-select/role-select" }),
    });
  },
  goLogin() {
    const { roles, roleIndex } = this.data;
    const role = roles[roleIndex].value;
    wx.redirectTo({ url: `/pages/login/login?role=${role}` });
  },
});
