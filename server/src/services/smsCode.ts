const TTL_MS = 5 * 60 * 1000;
const SEND_COOLDOWN_MS = 60 * 1000;

type Entry = { code: string; expires: number; /** 注册流程：必须与提交邮箱一致 */ boundEmail?: string };

const codeStore = new Map<string, Entry>();
const lastSendAt = new Map<string, number>();

function random6(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/** 下发验证码并写入内存；按 accountKey（这里用邮箱）存储 */
export function issueSmsCode(
  accountKey: string,
  options?: { boundEmail?: string }
): { ok: true; code: string; debugCode?: string } | { ok: false; message: string } {
  const key = (accountKey || "").trim().toLowerCase();
  if (!key) {
    return { ok: false, message: "缺少验证码账户" };
  }
  const now = Date.now();
  const last = lastSendAt.get(key) ?? 0;
  if (now - last < SEND_COOLDOWN_MS) {
    return { ok: false, message: "发送过于频繁，请 60 秒后再试" };
  }
  const code = random6();
  const bound = options?.boundEmail?.trim();
  codeStore.set(key, {
    code,
    expires: now + TTL_MS,
    ...(bound ? { boundEmail: bound } : {}),
  });
  lastSendAt.set(key, now);
  console.log(`[验证码] 账户 ${key} 验证码: ${code}（未配置 SMTP 时仅日志）`);
  const exposeDevCode =
    process.env.NODE_ENV !== "production" || process.env.SMS_DEBUG === "1" || process.env.EMAIL_DEBUG === "1";
  return { ok: true, code, ...(exposeDevCode ? { debugCode: code } : {}) };
}

/** 校验验证码是否正确且未过期（不删除）。注册时传 registerEmail 与发码时邮箱一致 */
export function verifySmsCodeOnly(accountKey: string, inputCode: string, registerEmail?: string): boolean {
  const key = (accountKey || "").trim().toLowerCase();
  const entry = codeStore.get(key);
  if (!entry || Date.now() > entry.expires) return false;
  if (entry.code !== (inputCode || "").trim()) return false;
  if (entry.boundEmail != null) {
    const e = (registerEmail || "").trim();
    if (!e || e !== entry.boundEmail) return false;
  }
  return true;
}

export function consumeSmsCode(phone: string): void {
  codeStore.delete((phone || "").trim().toLowerCase());
}

/** 发信失败时撤销本次下发，避免占用冷却且用户未收到邮件 */
export function revokeSmsCode(phone: string): void {
  const p = (phone || "").trim().toLowerCase();
  codeStore.delete(p);
  lastSendAt.delete(p);
}
