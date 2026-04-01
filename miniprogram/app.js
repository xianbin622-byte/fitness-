// 全局入口：存储 token 与用户信息
App({
  globalData: {
    // 本地开发：与后端端口一致（见终端）。正式上线前改为 HTTPS，例如 "https://api.你的域名.com"（须先在微信公众平台配置 request 合法域名）。
    apiBase: "http://127.0.0.1:3000",
    token: "",
    user: null,
  },
  onLaunch() {
    // 小程序无浏览器 window；部分 Three/GLTF 代码读 window.URL，与 globalThis.URL 对齐（基础库 2.19+ 提供 URL）
    if (typeof globalThis !== "undefined" && typeof globalThis.window === "undefined") {
      try {
        globalThis.window = globalThis;
      } catch (e) {}
    }
    try {
      const token = wx.getStorageSync("token");
      const user = wx.getStorageSync("user");
      if (token) this.globalData.token = token;
      if (user) this.globalData.user = user;
    } catch (e) {
      console.warn("读取本地存储失败", e);
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
