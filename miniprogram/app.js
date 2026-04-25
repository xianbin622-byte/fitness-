// 全局入口：存储 token 与用户信息
const runtime = require("./config/runtime.js");

function resolveApiBase() {
  if (runtime.USE_PROD_API) {
    return (runtime.PRODUCTION_API_BASE || "").replace(/\/$/, "");
  }
  return (runtime.DEVELOPMENT_API_BASE || "http://127.0.0.1:3000").replace(/\/$/, "");
}

App({
  globalData: {
    apiBase: resolveApiBase(),
    token: "",
    user: null,
  },
  onLaunch() {
    try {
      const token = wx.getStorageSync("token");
      const user = wx.getStorageSync("user");
      if (token) this.globalData.token = token;
      if (user) this.globalData.user = user;
    } catch (e) {
      console.warn("读取本地存储失败", e);
    }
    this.globalData.apiBase = resolveApiBase();
    if (!runtime.USE_PROD_API) {
      try {
        console.log("[apiBase]", this.globalData.apiBase);
      } catch (e) {}
    }
  },
  setSession(token, user) {
    this.globalData.token = token;
    this.globalData.user = user;
    wx.setStorageSync("token", token);
    wx.setStorageSync("user", user);
  },
  clearSession() {
    this.globalData.token = "";
    this.globalData.user = null;
    wx.removeStorageSync("token");
    wx.removeStorageSync("user");
  },
});
