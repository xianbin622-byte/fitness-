import nodemailer from "nodemailer";

/**
 * 发送邮箱验证码。未配置 SMTP_HOST 时不发信，仅依赖服务端日志 + 开发环境 debugCode。
 */
export async function sendVerificationEmail(to: string, code: string): Promise<void> {
  const host = (process.env.SMTP_HOST || "").trim();
  if (!host) {
    console.log(`[邮箱] 未配置 SMTP，跳过发信。收件人: ${to}`);
    return;
  }

  const port = Number(process.env.SMTP_PORT || "587");
  const secure =
    process.env.SMTP_SECURE === "1" || process.env.SMTP_SECURE === "true" || port === 465;
  const user = (process.env.SMTP_USER || "").trim();
  const pass = (process.env.SMTP_PASS || "").trim();
  const from = (process.env.SMTP_FROM || user || "noreply@localhost").trim();

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: user ? { user, pass } : undefined,
  });

  await transporter.sendMail({
    from,
    to,
    subject: "健身私教 — 验证码",
    text: `您的验证码是：${code}，5 分钟内有效。如非本人操作请忽略。`,
  });
}
