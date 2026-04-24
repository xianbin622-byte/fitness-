const api = require("../../utils/api.js");
const app = getApp();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isBackendUnavailable = (msg = "") =>
  /connection refused|err_connection_refused|127\.0\.0\.1:3000|无法连接服务器/i.test(msg);
const getHomeByRole = (user) =>
  user && user.role === "COACH" ? "/pages/coach/home/home" : "/pages/member/home/home";

function afterAuthEntryPath(user) {
  if (user && user.role === "COACH") return "/pages/coach/home/home";
  if (user && user.role === "MEMBER" && !user.memberProfileAt) {
    return "/pages/member/onboarding/onboarding";
  }
  if (user && user.role === "MEMBER") return "/pages/member/home/home";
  return "/pages/home/home";
}

Page({
  data: {
    email: "",
    smsCode: "",
    demoPhone: "",
    password: "",
    countdown: 0,
    statusBarH: 0,
    registerRole: "MEMBER",
    showPwdDemo: false,
    wxModalVisible: false,
  },
  _smsTimer: null,
  onLoad(query) {
    const r = query && query.role;
    if (r === "COACH" || r === "MEMBER") {
      this.setData({ registerRole: r });
    }
  },
  onUnload() {
    if (this._smsTimer) clearInterval(this._smsTimer);
  },
  goBack() {
    wx.navigateBack({ fail: () => wx.reLaunch({ url: "/pages/entry/role-select/role-select" }) });
  },
  onHelp() {
    wx.showModal({
      title: "帮助",
      content: "验证码会发送到您注册时绑定的邮箱。演示种子账号可使用「密码登录」中的手机号+密码。",
      showCancel: false,
    });
  },
  togglePwdDemo() {
    this.setData({ showPwdDemo: !this.data.showPwdDemo });
  },
  onEmail(e) {
    this.setData({ email: e.detail.value });
  },
  onSms(e) {
    this.setData({ smsCode: e.detail.value });
  },
  onDemoPhone(e) {
    this.setData({ demoPhone: e.detail.value });
  },
  onPwd(e) {
    this.setData({ password: e.detail.value });
  },
  async sendEmailCode() {
    const { email, countdown } = this.data;
    if (countdown > 0) return;
    const em = (email || "").trim();
    if (!em || !EMAIL_RE.test(em)) {
      wx.showToast({ title: "请填写有效邮箱", icon: "none" });
      return;
    }
    wx.showLoading({ title: "发送中" });
    try {
      const res = await api.sendEmailCode({ email: em });
      if (!res.ok) throw new Error(res.message || "失败");
      if (res.debugCode) {
        wx.showModal({
          title: "开发环境",
          content: "验证码：" + res.debugCode + "\n（未配 SMTP 时请看终端日志）",
          showCancel: false,
        });
      } else {
        wx.showToast({ title: "已发至邮箱", icon: "success" });
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
  noop() {},
  openWxModal() {
    this.setData({ wxModalVisible: true });
  },
  closeWxModal() {
    this.setData({ wxModalVisible: false });
  },
  async runWechatLogin() {
    wx.showLoading({ title: "登录中", mask: true });
    let ok = false;
    try {
      const loginRes = await new Promise((resolve, reject) => {
        wx.login({ success: resolve, fail: reject });
      });
      if (!loginRes.code) {
        throw new Error(loginRes.errMsg || "wx.login 未返回 code");
      }
      const res = await api.wechatLogin({ code: loginRes.code });
      if (!res.ok) throw new Error(res.message || "失败");
      app.setSession(res.data.token, res.data.user);
      this.setData({ wxModalVisible: false });
      ok = true;
    } catch (e) {
      const msg = e.message || "登录失败";
      if (/尚未绑定|请先.*注册/.test(msg)) {
        wx.showModal({
          title: "提示",
          content: "该微信尚未注册，请返回首页选择角色后，在注册页完成微信授权。",
          showCancel: false,
        });
      } else if (isBackendUnavailable(msg)) {
        this.setData({ wxModalVisible: false });
        wx.showModal({
          title: "后端未连接",
          content: "请先在项目根目录运行 npm run server，再重试微信快捷登录。",
          showCancel: false,
        });
      } else {
        wx.showToast({ title: msg, icon: "none" });
      }
    } finally {
      wx.hideLoading();
    }
    if (ok) {
      wx.showToast({ title: "欢迎回来", icon: "success" });
      wx.reLaunch({ url: afterAuthEntryPath(app.globalData.user || wx.getStorageSync("user")) });
    }
  },
  openPrivacy() {
    wx.showToast({ title: "请稍后在设置中查看隐私政策", icon: "none" });
  },
  openTerms() {
    wx.showToast({ title: "请稍后在设置中查看用户协议", icon: "none" });
  },
  goRegister() {
    const { registerRole } = this.data;
    wx.navigateTo({ url: `/pages/register/register?role=${registerRole}` });
  },
  async onLogin() {
    const { email, smsCode, demoPhone, password, showPwdDemo } = this.data;
    const em = (email || "").trim();
    const code = (smsCode || "").trim();
    const pwd = password || "";
    const p = (demoPhone || "").trim();

    wx.showLoading({ title: "登录中" });
    let loginOk = false;
    try {
      let res;
      if (code) {
        if (!em || !EMAIL_RE.test(em)) {
          wx.hideLoading();
          wx.showToast({ title: "请填写注册邮箱", icon: "none" });
          return;
        }
        res = await api.login({ email: em, smsCode: code });
      } else if (showPwdDemo && pwd) {
        const id = (p || em).trim();
        if (!id) {
          wx.hideLoading();
          wx.showToast({ title: "请填写手机号或邮箱", icon: "none" });
          return;
        }
        if (/^1\d{10}$/.test(id)) {
          res = await api.login({ phone: id, password: pwd });
        } else if (EMAIL_RE.test(id)) {
          res = await api.login({ email: id, password: pwd });
        } else {
          wx.hideLoading();
          wx.showToast({ title: "账号格式不正确", icon: "none" });
          return;
        }
      } else {
        wx.hideLoading();
        wx.showToast({ title: "请填写验证码，或展开密码登录", icon: "none" });
        return;
      }
      if (!res.ok) throw new Error(res.message || "失败");
      app.setSession(res.data.token, res.data.user);
      loginOk = true;
    } catch (e) {
      const msg = e.message || "登录失败";
      if (isBackendUnavailable(msg)) {
        wx.showModal({
          title: "后端未连接",
          content: "请先在项目根目录运行 npm run server，再执行登录。",
          showCancel: false,
        });
      } else {
        wx.showToast({ title: msg, icon: "none" });
      }
    } finally {
      wx.hideLoading();
    }
    if (loginOk) {
      wx.showToast({ title: "欢迎回来", icon: "success" });
      wx.reLaunch({ url: afterAuthEntryPath(app.globalData.user || wx.getStorageSync("user")) });
    }
  },
});
