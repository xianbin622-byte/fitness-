const api = require("../../utils/api.js");
const app = getApp();

Page({
  data: {
    roles: [
      { label: "会员", value: "MEMBER" },
      { label: "教练", value: "COACH" },
    ],
    roleIndex: 0,
    nickname: "",
    phone: "",
    smsCode: "",
    countdown: 0,
  },
  _smsTimer: null,
  onUnload() {
    if (this._smsTimer) clearInterval(this._smsTimer);
  },
  onRole(e) {
    this.setData({ roleIndex: Number(e.detail.value) });
  },
  onNick(e) {
    this.setData({ nickname: e.detail.value });
  },
  onPhone(e) {
    this.setData({ phone: e.detail.value });
  },
  onSms(e) {
    this.setData({ smsCode: e.detail.value });
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
          content: "验证码：" + res.debugCode + "\n（请确保本机已启动后端 API）",
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
  async onReg() {
    const { roles, roleIndex, nickname, phone, smsCode } = this.data;
    if (!nickname || !/^1\d{10}$/.test((phone || "").trim())) {
      wx.showToast({ title: "请填写昵称与11位手机号", icon: "none" });
      return;
    }
    if (!smsCode || String(smsCode).trim().length < 4) {
      wx.showToast({ title: "请填写短信验证码", icon: "none" });
      return;
    }
    wx.showLoading({ title: "注册中" });
    try {
      const res = await api.register({
        nickname,
        phone: phone.trim(),
        smsCode: String(smsCode).trim(),
        role: roles[roleIndex].value,
      });
      if (!res.ok) throw new Error(res.message || "失败");
      app.setSession(res.data.token, res.data.user);
      wx.showToast({ title: "注册成功", icon: "success" });
      wx.reLaunch({ url: "/pages/home/home" });
    } catch (e) {
      wx.showToast({ title: e.message || "注册失败", icon: "none" });
    } finally {
      wx.hideLoading();
    }
  },
});
