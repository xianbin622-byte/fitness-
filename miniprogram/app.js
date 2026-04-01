// 全局入口：存储 token 与用户信息
App({
  globalData: {
    // 须与后端终端「健身私教 API 已启动」的端口一致；默认 3000（.env）。若顺延到 3003 等，请改成同端口。
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
