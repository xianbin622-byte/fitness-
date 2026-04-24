/**
 * 环境配置：发正式/体验版前将 USE_PROD_API 改为 true，并填 PRODUCTION_API_BASE（HTTPS 域名，无尾斜杠）
 * 开发调试保持 false，将使用 DEVELOPMENT_API_BASE
 */
module.exports = {
  /** 本地开发默认 false；提审/上线前再改为 true */
  USE_PROD_API: false,
  /** 生产环境 API 根地址，例如 https://api.yourdomain.com */
  PRODUCTION_API_BASE: "https://api.laohuangfit.cn",
  /** 本机/局域网调试用，与 server 监听的 host:port 一致 */
  DEVELOPMENT_API_BASE: "http://127.0.0.1:3000",
};
