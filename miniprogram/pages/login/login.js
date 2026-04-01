const api = require("../../utils/api.js");
const app = getApp();

Page({
  data: { phone: "", smsCode: "", password: "", countdown: 0 },
  _smsTimer: null,
  onUnload() {
    if (this._smsTimer) clearInterval(this._smsTimer);
  },
  onPhone(e) {
    this.setData({ phone: e.detail.value });
  },
  onSms(e) {
    this.setData({ smsCode: e.detail.value });
  },
  onPwd(e) {
    this.setData({ password: e.detail.value });
  },
  async sendSms() {
    const { phone, countdown } = this.data;
    if (countdown > 0) return;
    if (!/^1\d{10}$/.test((phone || "").trim())) {
      wx.showToast({ title: "请输入11位手机号", icon: "none" });
      return;
    }
    wx.showLoading({ title: "发送中" });
    try {
      const res = await api.sendSms(phone.trim());
      if (!res.ok) throw new Error(res.message || "失败");
      if (res.debugCode) {
        wx.showModal({
          title: "开发环境",
          content: "验证码：" + res.debugCode + "\n（生产环境将下发真实短信；请确保本机已启动后端）",
          showCancel: false,
        });
      } else {
        wx.showToast({ title: "已发送", icon: "success" });
      }
      this.startCountdown();
    } catch (e) {
      wx.showToast({ title: e.message || "发送失败", icon: "none" });
    } finally {
      wx.hideLoading();
    }
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
  async onLogin() {
    const { phone, smsCode, password } = this.data;
    const p = (phone || "").trim();
    if (!p) {
      wx.showToast({ title: "请填写手机号", icon: "none" });
      return;
    }
    const code = (smsCode || "").trim();
    const pwd = password || "";
    if (!code && !pwd) {
      wx.showToast({ title: "请填写验证码或演示密码", icon: "none" });
      return;
    }
    wx.showLoading({ title: "登录中" });
    let loginOk = false;
    try {
      let res;
      if (code) {
        res = await api.login({ phone: p, smsCode: code });
      } else {
        res = await api.login({ phone: p, password: pwd });
      }
      if (!res.ok) throw new Error(res.message || "失败");
      app.setSession(res.data.token, res.data.user);
      loginOk = true;
    } catch (e) {
      wx.showToast({ title: e.message || "登录失败", icon: "none" });
    } finally {
      wx.hideLoading();
    }
    if (loginOk) {
      wx.showToast({ title: "欢迎回来", icon: "success" });
      wx.reLaunch({ url: "/pages/home/home" });
    }
  },
});
