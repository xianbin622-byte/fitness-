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
    statusBarH: 0,
    roleFromEntry: false,
    wxModalVisible: false,
  },
  onLoad(query) {
    const r = query && query.role;
    if (r === "COACH") {
      this.setData({ roleIndex: 1, roleFromEntry: true });
    } else if (r === "MEMBER") {
      this.setData({ roleIndex: 0, roleFromEntry: true });
    }
  },
  noop() {},
  onRole(e) {
    this.setData({ roleIndex: Number(e.detail.value) });
  },
  onNick(e) {
    this.setData({ nickname: e.detail.value });
  },
  openWxModal() {
    this.setData({ wxModalVisible: true });
  },
  closeWxModal() {
    this.setData({ wxModalVisible: false });
  },
  async runWechatRegister() {
    wx.showLoading({ title: "授权中", mask: true });
    let ok = false;
    try {
      const loginRes = await new Promise((resolve, reject) => {
        wx.login({ success: resolve, fail: reject });
      });
      if (!loginRes.code) {
        throw new Error(loginRes.errMsg || "wx.login 未返回 code");
      }
      const { roles, roleIndex, nickname } = this.data;
      const res = await api.wechatLogin({
        code: loginRes.code,
        role: roles[roleIndex].value,
        nickname: (nickname || "").trim(),
      });
      if (!res.ok) throw new Error(res.message || "失败");
      app.setSession(res.data.token, res.data.user);
      this.setData({ wxModalVisible: false });
      ok = true;
    } catch (e) {
      const msg = e.message || "注册失败";
      if (isBackendUnavailable(msg)) {
        this.setData({ wxModalVisible: false });
        const apiBase = (app.globalData && app.globalData.apiBase) || "";
        wx.showModal({
          title: "后端请求超时",
          content: apiBase.startsWith("https://")
            ? "当前使用线上接口，请确认服务器可访问（含 443、防火墙、HTTPS 证书、域名解析）。若本地联调，请把 miniprogram/config/runtime.js 的 USE_PROD_API 改为 false。"
            : "请先在项目根目录运行 npm run server，再重试微信快捷注册。",
          showCancel: false,
        });
      } else {
        wx.showToast({ title: msg, icon: "none" });
      }
    } finally {
      wx.hideLoading();
    }
    if (ok) {
      wx.showToast({ title: "注册成功", icon: "success" });
      wx.reLaunch({ url: afterAuthEntryPath(app.globalData.user || wx.getStorageSync("user")) });
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
