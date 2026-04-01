const app = getApp();

/**
 * 封装 wx.request，自动带 JWT
 * 请将 app.globalData.apiBase 改为本机局域网 IP 以便真机调试
 */
function request(options) {
  const { url, method = "GET", data = {}, header = {} } = options;
  const base = app.globalData.apiBase || "";
  const token = app.globalData.token || wx.getStorageSync("token");
  return new Promise((resolve, reject) => {
    wx.request({
      url: base + url,
      method,
      data,
      timeout: 30000,
      header: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: "Bearer " + token } : {}),
        ...header,
      },
      success(res) {
        const body = res.data;
        if (res.statusCode >= 200 && res.statusCode < 300) {
          if (body && body.ok === false) {
            reject(new Error(body.message || "请求失败"));
            return;
          }
          resolve(body);
        } else {
          const msg = (body && body.message) || "请求失败(" + res.statusCode + ")";
          reject(new Error(msg));
        }
      },
      fail(err) {
        const msg = (err && err.errMsg) || "";
        if (/timeout/i.test(msg)) {
          reject(new Error("请求超时，请检查网络或稍后重试"));
        } else if (/fail connect|connection refused|CONNECTION_REFUSED|无法连接|连接失败/i.test(msg)) {
          reject(new Error("无法连接服务器：请在本机启动后端（server 目录 npm start），并检查 app.js 里 apiBase"));
        } else {
          reject(new Error(msg || "网络异常"));
        }
      },
    });
  });
}

module.exports = { request };
