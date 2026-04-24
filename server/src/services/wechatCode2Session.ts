/**
 * 小程序 wx.login 的 code → openid
 * - 生产：必须配置 WECHAT_APPID + WECHAT_APP_SECRET
 * - 本地：可设 WECHAT_DEV_MOCK=1；或未配密钥且 NODE_ENV≠production 时自动 mock（仅开发）
 */
export async function jscode2Session(jsCode: string): Promise<
  { ok: true; openid: string } | { ok: false; message: string }
> {
  const code = (jsCode || "").trim();
  if (!code) {
    return { ok: false, message: "缺少登录 code" };
  }

  const appid = process.env.WECHAT_APPID?.trim();
  const secret = process.env.WECHAT_APP_SECRET?.trim();
  const useDevMock =
    process.env.NODE_ENV !== "production" &&
    (process.env.WECHAT_DEV_MOCK === "1" || !appid || !secret);

  if (useDevMock) {
    if (!process.env.WECHAT_DEV_MOCK && (!appid || !secret)) {
      console.warn(
        "[微信登录] 开发环境未配置 WECHAT_APP_SECRET，已自动使用本地 mock openid（勿用于生产）",
      );
    }
    return { ok: true, openid: `dev_mock_${code.slice(0, 16)}` };
  }

  if (!appid || !secret) {
    return {
      ok: false,
      message: "服务端未配置 WECHAT_APPID / WECHAT_APP_SECRET，无法微信登录",
    };
  }

  const url =
    "https://api.weixin.qq.com/sns/jscode2session?" +
    new URLSearchParams({
      appid,
      secret,
      js_code: code,
      grant_type: "authorization_code",
    }).toString();

  const res = await fetch(url);
  const data = (await res.json()) as {
    openid?: string;
    errcode?: number;
    errmsg?: string;
  };

  if (data.errcode && data.errcode !== 0) {
    return { ok: false, message: data.errmsg || `微信接口错误 ${data.errcode}` };
  }
  if (!data.openid) {
    return { ok: false, message: "微信未返回 openid" };
  }
  return { ok: true, openid: data.openid };
}
