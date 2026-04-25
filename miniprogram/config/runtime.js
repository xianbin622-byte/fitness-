/**
 * 环境配置（上线前只改本文件即可；app.js 会据此设置 globalData.apiBase）
 * - 提审/发正式：USE_PROD_API = true，PRODUCTION_API_BASE 为你的 HTTPS API 根（无尾斜杠）
 * - 本地/模拟器：USE_PROD_API = false，按需改 DEVELOPMENT_API_BASE；真机连本机后端请填电脑局域网 IP
 */
module.exports = {
  /** 当前已连通生产 API，默认走生产地址 */
  USE_PROD_API: true,
  /** 生产环境 API 根地址，例如 https://api.yourdomain.com */
  PRODUCTION_API_BASE: "https://api.laohuangfit.cn",
  /** 本机/局域网调试用，与 server 监听的 host:port 一致 */
  DEVELOPMENT_API_BASE: "http://127.0.0.1:3000",
};
