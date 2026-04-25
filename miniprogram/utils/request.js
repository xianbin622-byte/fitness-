const app = getApp();

/**
 * 封装 wx.request，自动带 JWT
 * apiBase 来自 app.js（读 config/runtime.js）；真机连本机后端请改 runtime 里 DEVELOPMENT_API_BASE 为电脑局域网 IP
 */
function request(options) {
  const { url, method = "GET", data = {}, header = {} } = options;
  const base = app.globalData.apiBase || "";
  const token = app.globalData.token || wx.getStorageSync("token");
  const tryBases = [base];
  // 开发环境容错：覆盖 127.0.0.1/localhost + 3000/3001 组合
  if (/^http:\/\/(127\.0\.0\.1|localhost):(3000|3001|3002|3003|3004|3005)$/i.test(base)) {
    const candidates = [
      "http://127.0.0.1:3000",
      "http://127.0.0.1:3001",
      "http://127.0.0.1:3002",
      "http://127.0.0.1:3003",
      "http://127.0.0.1:3004",
      "http://127.0.0.1:3005",
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:3002",
      "http://localhost:3003",
      "http://localhost:3004",
      "http://localhost:3005",
    ];
    candidates.forEach((it) => {
      if (!tryBases.includes(it)) tryBases.push(it);
    });
  }

  const makeRequest = (baseUrl) =>
    new Promise((resolve, reject) => {
      wx.request({
        url: baseUrl + url,
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
            const err = new Error(msg);
            err.statusCode = res.statusCode;
            reject(err);
          }
        },
        fail(err) {
          const msg = (err && err.errMsg) || "";
          reject(new Error(msg || "网络异常"));
        },
      });
    });

  return new Promise(async (resolve, reject) => {
    let lastErr = null;
    for (let i = 0; i < tryBases.length; i += 1) {
      try {
        const dataRes = await makeRequest(tryBases[i]);
        if (i > 0) {
          app.globalData.apiBase = tryBases[i];
        }
        resolve(dataRes);
        return;
      } catch (e) {
        lastErr = e;
        const msg = (e && e.message) || "";
        const isRetryableNet = /timeout|fail connect|connection refused|CONNECTION_REFUSED|无法连接|连接失败/i.test(msg);
        const isVirtualMember404 =
          url === "/api/coaches/members/virtual" && e && e.statusCode === 404;
        const isRetryable = isRetryableNet || isVirtualMember404;
        if (!isRetryable || i === tryBases.length - 1) break;
      }
    }

    const msg = (lastErr && lastErr.message) || "";
    if (/timeout/i.test(msg)) {
      reject(new Error("请求超时，请检查网络或稍后重试"));
    } else if (/fail connect|connection refused|CONNECTION_REFUSED|无法连接|连接失败/i.test(msg)) {
      reject(new Error("无法连接服务器：请先在项目根目录运行 npm run server"));
    } else {
      reject(new Error(msg || "网络异常"));
    }
  });
}

module.exports = { request };
