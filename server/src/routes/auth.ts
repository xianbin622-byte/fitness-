import crypto from "crypto";
import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { signToken } from "../lib/jwt";
import type { AuthedRequest } from "../middleware/auth";
import { authMiddleware } from "../middleware/auth";
import {
  issueSmsCode,
  verifySmsCodeOnly,
  consumeSmsCode,
  revokeSmsCode,
  isValidPhone,
} from "../services/smsCode";
import { sendVerificationEmail } from "../services/sendMail";
import { isValidEmail } from "../services/emailValidation";
import { jscode2Session } from "../services/wechatCode2Session";

const r = Router();

function tokenPayload(user: { id: string; role: string; phone: string | null }) {
  return signToken({
    sub: user.id,
    role: user.role as "MEMBER" | "COACH",
    phone: user.phone ?? "",
  });
}

const userPublicSelect = {
  id: true,
  phone: true,
  nickname: true,
  role: true,
  avatar: true,
  heightCm: true,
  weightKg: true,
  bodyFatPct: true,
  skeletalMusclePct: true,
  waistCm: true,
  hipCm: true,
  birthday: true,
  exercisePreference: true,
  gender: true,
  memberProfileAt: true,
} as const;

function userResponse(
  user: {
    id: string;
    phone: string | null;
    nickname: string;
    role: string;
    avatar: string | null;
    heightCm?: number | null;
    weightKg?: number | null;
    bodyFatPct?: number | null;
    skeletalMusclePct?: number | null;
    waistCm?: number | null;
    hipCm?: number | null;
    birthday?: Date | null;
    exercisePreference?: string | null;
    gender?: string | null;
    memberProfileAt?: Date | null;
  },
) {
  return {
    id: user.id,
    phone: user.phone ?? "",
    nickname: user.nickname,
    role: user.role,
    avatar: user.avatar,
    heightCm: user.heightCm ?? null,
    weightKg: user.weightKg ?? null,
    bodyFatPct: user.bodyFatPct ?? null,
    skeletalMusclePct: user.skeletalMusclePct ?? null,
    waistCm: user.waistCm ?? null,
    hipCm: user.hipCm ?? null,
    birthday: user.birthday ? user.birthday.toISOString().slice(0, 10) : null,
    exercisePreference: user.exercisePreference ?? null,
    gender: user.gender ?? null,
    memberProfileAt: user.memberProfileAt ? user.memberProfileAt.toISOString() : null,
  };
}

/**
 * 发送邮箱验证码（内存中按手机号存码）
 * - 已注册：可仅填「注册邮箱」或仅填「手机号」，邮件发到账号绑定邮箱
 * - 未注册：须填「手机号 + 邮箱」，与注册提交一致
 */
r.post("/email/send", async (req, res) => {
  const { phone, email } = req.body as { phone?: string; email?: string };
  const phoneTrim = (phone || "").trim();
  const emailTrim = (email || "").trim();

  let existing = null as {
    phone: string | null;
    email: string | null;
  } | null;

  if (phoneTrim && isValidPhone(phoneTrim)) {
    existing = await prisma.user.findUnique({
      where: { phone: phoneTrim },
      select: { phone: true, email: true },
    });
  }

  if (!existing && emailTrim && isValidEmail(emailTrim)) {
    existing = await prisma.user.findFirst({
      where: { email: emailTrim },
      select: { phone: true, email: true },
    });
  }

  let phoneNorm: string;
  let targetEmail: string;

  if (existing) {
    if (!existing.email?.trim()) {
      return res.status(400).json({
        ok: false,
        message: "该账号未绑定邮箱，请使用密码登录或联系管理员绑定邮箱",
      });
    }
    const p = existing.phone?.trim();
    if (!p) {
      return res.status(400).json({
        ok: false,
        message: "该账号为微信注册且无手机号，请使用微信快捷登录",
      });
    }
    phoneNorm = p;
    targetEmail = existing.email.trim();
  } else {
    if (!phoneTrim || !isValidPhone(phoneTrim)) {
      return res.status(400).json({
        ok: false,
        message: "未注册请填写11位手机号与邮箱后再获取验证码",
      });
    }
    if (!emailTrim || !isValidEmail(emailTrim)) {
      return res.status(400).json({ ok: false, message: "请填写有效邮箱" });
    }
    const emailNorm = emailTrim;
    const emailTaken = await prisma.user.findFirst({
      where: { email: emailNorm },
    });
    if (emailTaken) {
      return res.status(409).json({ ok: false, message: "该邮箱已被其他账号使用" });
    }
    phoneNorm = phoneTrim;
    targetEmail = emailNorm;
  }

  const issued = existing
    ? issueSmsCode(phoneNorm)
    : issueSmsCode(phoneNorm, { boundEmail: targetEmail });
  if (!issued.ok) {
    return res.status(400).json({ ok: false, message: issued.message });
  }

  try {
    await sendVerificationEmail(targetEmail, issued.code);
  } catch (e) {
    revokeSmsCode(phoneNorm);
    const msg = e instanceof Error ? e.message : "发信失败";
    console.error("[邮箱] 发送失败:", e);
    return res.status(502).json({ ok: false, message: `邮件发送失败：${msg}` });
  }

  return res.json({
    ok: true,
    message: "验证码已发送至邮箱",
    ...(issued.debugCode ? { debugCode: issued.debugCode } : {}),
  });
});

/** @deprecated 已改为 POST /api/auth/email/send */
r.post("/sms/send", (_req, res) => {
  return res.status(410).json({
    ok: false,
    message: "已改为邮箱验证码，请使用 POST /api/auth/email/send",
  });
});

/** 注册：邮箱验证码 + 昵称 + 角色 + 邮箱（与发码时一致） */
r.post("/register", async (req, res) => {
  const { phone, email, smsCode, nickname, role } = req.body as {
    phone?: string;
    email?: string;
    smsCode?: string;
    nickname?: string;
    role?: "MEMBER" | "COACH";
  };
  if (!phone || !email || !smsCode || !nickname || !role) {
    return res.status(400).json({
      ok: false,
      message: "请填写手机号、邮箱、验证码、昵称并选择角色",
    });
  }
  if (!["MEMBER", "COACH"].includes(role)) {
    return res.status(400).json({ ok: false, message: "角色无效" });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ ok: false, message: "邮箱格式不正确" });
  }
  const emailNorm = email.trim();
  if (!verifySmsCodeOnly(phone, smsCode, emailNorm)) {
    return res.status(400).json({ ok: false, message: "验证码错误或已过期，请重新获取" });
  }
  const exists = await prisma.user.findUnique({ where: { phone: phone.trim() } });
  if (exists) {
    return res.status(409).json({ ok: false, message: "该手机号已注册，请直接登录" });
  }
  const emailTaken = await prisma.user.findFirst({
    where: { email: emailNorm },
  });
  if (emailTaken) {
    return res.status(409).json({ ok: false, message: "该邮箱已被注册" });
  }
  const passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 10);
  const user = await prisma.user.create({
    data: {
      phone: phone.trim(),
      email: emailNorm,
      nickname,
      role,
      passwordHash,
    },
    select: userPublicSelect,
  });
  consumeSmsCode(phone);
  const token = tokenPayload(user);
  return res.json({ ok: true, data: { user: userResponse(user), token } });
});

/**
 * 登录：
 * - 推荐：注册邮箱或手机号 + 邮箱验证码（smsCode）
 * - 兼容种子账号：手机号或邮箱 + 密码（password）
 */
r.post("/login", async (req, res) => {
  const { phone, email, smsCode, password } = req.body as {
    phone?: string;
    email?: string;
    smsCode?: string;
    password?: string;
  };
  const phoneTrim = (phone || "").trim();
  const emailTrim = (email || "").trim();

  let phoneNorm: string | undefined;
  if (phoneTrim && isValidPhone(phoneTrim)) {
    phoneNorm = phoneTrim;
  } else if (emailTrim && isValidEmail(emailTrim)) {
    const u = await prisma.user.findFirst({
      where: { email: emailTrim },
      select: { phone: true },
    });
    if (!u) {
      return res.status(404).json({ ok: false, message: "该邮箱尚未注册" });
    }
    if (!u.phone?.trim()) {
      return res.status(400).json({
        ok: false,
        message: "该账号请使用微信快捷登录",
      });
    }
    phoneNorm = u.phone.trim();
  }

  if (!phoneNorm) {
    return res.status(400).json({ ok: false, message: "请输入注册手机号或邮箱" });
  }

  if (smsCode) {
    if (!verifySmsCodeOnly(phoneNorm, smsCode)) {
      return res.status(400).json({ ok: false, message: "验证码错误或已过期，请重新获取" });
    }
    const user = await prisma.user.findUnique({
      where: { phone: phoneNorm },
      select: userPublicSelect,
    });
    if (!user) {
      return res.status(404).json({ ok: false, message: "该手机号尚未注册，请先注册" });
    }
    consumeSmsCode(phoneNorm);
    const token = tokenPayload(user);
    return res.json({
      ok: true,
      data: { user: userResponse(user), token },
    });
  }

  if (password) {
    const user = await prisma.user.findUnique({ where: { phone: phoneNorm } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ ok: false, message: "账号或密码错误" });
    }
    const full = await prisma.user.findUnique({
      where: { phone: phoneNorm },
      select: userPublicSelect,
    });
    if (!full) {
      return res.status(500).json({ ok: false, message: "数据异常" });
    }
    const token = tokenPayload(user);
    return res.json({
      ok: true,
      data: { user: userResponse(full), token },
    });
  }

  return res.status(400).json({ ok: false, message: "请使用验证码登录，或填写密码（演示种子账号）" });
});

/**
 * 微信快捷登录：小程序 wx.login 得到 code 后调用。
 * - 已绑定 openid：直接登录
 * - 未绑定且 body 带 role（MEMBER|COACH）：注册并登录
 * - 未绑定且无 role：返回 code NEED_REGISTER（请在注册页完成）
 */
r.post("/wechat/login", async (req, res) => {
  const { code, role, nickname } = req.body as {
    code?: string;
    role?: "MEMBER" | "COACH";
    nickname?: string;
  };
  const session = await jscode2Session((code || "").trim());
  if (!session.ok) {
    return res.status(502).json({ ok: false, message: session.message });
  }
  const { openid } = session;

  const existing = await prisma.user.findUnique({
    where: { wechatOpenId: openid },
    select: userPublicSelect,
  });

  if (existing) {
    const token = tokenPayload(existing);
    return res.json({ ok: true, data: { user: userResponse(existing), token } });
  }

  if (!role || !["MEMBER", "COACH"].includes(role)) {
    return res.status(400).json({
      ok: false,
      code: "NEED_REGISTER",
      message: "该微信尚未绑定账号，请先在注册页完成授权",
    });
  }

  const passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 10);
  const nick = (nickname || "").trim() || "微信用户";
  const user = await prisma.user.create({
    data: {
      wechatOpenId: openid,
      nickname: nick,
      role,
      passwordHash,
    },
    select: userPublicSelect,
  });
  const token = tokenPayload(user);
  return res.json({ ok: true, data: { user: userResponse(user), token } });
});

/** 当前用户信息 */
r.get("/me", authMiddleware, async (req: AuthedRequest, res) => {
  const u = await prisma.user.findUnique({
    where: { id: req.user!.sub },
    select: { ...userPublicSelect, createdAt: true },
  });
  if (!u) return res.status(404).json({ ok: false, message: "用户不存在" });
  const { createdAt, ...rest } = u;
  return res.json({
    ok: true,
    data: { ...userResponse(rest as Parameters<typeof userResponse>[0]), createdAt },
  });
});

export const authRouter = r;
