/** 国内手机号 */
const PHONE_RE = /^1\d{10}$/;
const TTL_MS = 5 * 60 * 1000;
const SEND_COOLDOWN_MS = 60 * 1000;

type Entry = { code: string; expires: number };

const codeStore = new Map<string, Entry>();
const lastSendAt = new Map<string, number>();

function random6(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function isValidPhone(phone: string): boolean {
  return PHONE_RE.test((phone || "").trim());
}

/** 发送验证码（生产环境应接入短信服务商，此处仅生成并记录） */
export function issueSmsCode(phone: string): { ok: true; debugCode?: string } | { ok: false; message: string } {
  const p = phone.trim();
  if (!isValidPhone(p)) {
    return { ok: false, message: "请输入正确的11位手机号" };
  }
  const now = Date.now();
  const last = lastSendAt.get(p) ?? 0;
  if (now - last < SEND_COOLDOWN_MS) {
    return { ok: false, message: "发送过于频繁，请 60 秒后再试" };
  }
  const code = random6();
  codeStore.set(p, { code, expires: now + TTL_MS });
  lastSendAt.set(p, now);
  console.log(`[SMS/开发] ${p} 验证码: ${code}（生产环境将改为真实短信通道）`);
  const exposeDevCode = process.env.NODE_ENV !== "production" || process.env.SMS_DEBUG === "1";
  return { ok: true, ...(exposeDevCode ? { debugCode: code } : {}) };
}

/** 校验验证码是否正确且未过期（不删除） */
export function verifySmsCodeOnly(phone: string, inputCode: string): boolean {
  const p = phone.trim();
  const entry = codeStore.get(p);
  if (!entry || Date.now() > entry.expires) return false;
  return entry.code === (inputCode || "").trim();
}

export function consumeSmsCode(phone: string): void {
  codeStore.delete(phone.trim());
}
