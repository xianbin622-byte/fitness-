/** 国内手机号 */
const PHONE_RE = /^1\d{10}$/;
const TTL_MS = 5 * 60 * 1000;
const SEND_COOLDOWN_MS = 60 * 1000;

type Entry = { code: string; expires: number; /** 注册流程：必须与提交邮箱一致 */ boundEmail?: string };

const codeStore = new Map<string, Entry>();
const lastSendAt = new Map<string, number>();

function random6(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function isValidPhone(phone: string): boolean {
  return PHONE_RE.test((phone || "").trim());
}

/** 下发验证码并写入内存；注册场景传入 boundEmail 与后续注册邮箱对齐 */
export function issueSmsCode(
  phone: string,
  options?: { boundEmail?: string }
): { ok: true; code: string; debugCode?: string } | { ok: false; message: string } {
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
  const bound = options?.boundEmail?.trim();
  codeStore.set(p, {
    code,
    expires: now + TTL_MS,
    ...(bound ? { boundEmail: bound } : {}),
  });
  lastSendAt.set(p, now);
  console.log(`[验证码] 手机号 ${p} 验证码: ${code}（未配置 SMTP 时仅日志）`);
  const exposeDevCode =
    process.env.NODE_ENV !== "production" || process.env.SMS_DEBUG === "1" || process.env.EMAIL_DEBUG === "1";
  return { ok: true, code, ...(exposeDevCode ? { debugCode: code } : {}) };
}

/** 校验验证码是否正确且未过期（不删除）。注册时传 registerEmail 与发码时邮箱一致 */
export function verifySmsCodeOnly(phone: string, inputCode: string, registerEmail?: string): boolean {
  const p = phone.trim();
  const entry = codeStore.get(p);
  if (!entry || Date.now() > entry.expires) return false;
  if (entry.code !== (inputCode || "").trim()) return false;
  if (entry.boundEmail != null) {
    const e = (registerEmail || "").trim();
    if (!e || e !== entry.boundEmail) return false;
  }
  return true;
}

export function consumeSmsCode(phone: string): void {
  codeStore.delete(phone.trim());
}

/** 发信失败时撤销本次下发，避免占用冷却且用户未收到邮件 */
export function revokeSmsCode(phone: string): void {
  const p = phone.trim();
  codeStore.delete(p);
  lastSendAt.delete(p);
}
