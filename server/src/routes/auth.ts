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

/** 发送邮箱验证码（内存按邮箱存码） */
r.post("/email/send", async (req, res) => {
  const { email } = req.body as { email?: string };
  const emailTrim = (email || "").trim();
  if (!emailTrim || !isValidEmail(emailTrim)) {
    return res.status(400).json({ ok: false, message: "请填写有效邮箱" });
  }
  const emailNorm = emailTrim.toLowerCase();

  const issued = issueSmsCode(emailNorm, { boundEmail: emailNorm });
  if (!issued.ok) {
    return res.status(400).json({ ok: false, message: issued.message });
  }

  try {
    await sendVerificationEmail(emailNorm, issued.code);
  } catch (e) {
    revokeSmsCode(emailNorm);
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

/** 注册：邮箱验证码 + 昵称 + 角色（纯邮箱） */
r.post("/register", async (req, res) => {
  const { email, smsCode, nickname, role } = req.body as {
    email?: string;
    smsCode?: string;
    nickname?: string;
    role?: "MEMBER" | "COACH";
  };
  if (!email || !smsCode || !nickname || !role) {
    return res.status(400).json({
      ok: false,
      message: "请填写邮箱、验证码、昵称并选择角色",
    });
  }
  if (!["MEMBER", "COACH"].includes(role)) {
    return res.status(400).json({ ok: false, message: "角色无效" });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ ok: false, message: "邮箱格式不正确" });
  }
  const emailNorm = email.trim().toLowerCase();
  if (!verifySmsCodeOnly(emailNorm, smsCode, emailNorm)) {
    return res.status(400).json({ ok: false, message: "验证码错误或已过期，请重新获取" });
  }
  const exists = await prisma.user.findFirst({ where: { email: emailNorm } });
  if (exists) {
    return res.status(409).json({ ok: false, message: "该邮箱已被注册" });
  }
  const passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 10);
  const user = await prisma.user.create({
    data: {
      phone: null,
      email: emailNorm,
      nickname,
      role,
      passwordHash,
    },
    select: userPublicSelect,
  });
  consumeSmsCode(emailNorm);
  const token = tokenPayload(user);
  return res.json({ ok: true, data: { user: userResponse(user), token } });
});

/**
 * 登录：
 * - 推荐：注册邮箱 + 邮箱验证码（smsCode）
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

  const emailNorm = emailTrim.toLowerCase();

  if (smsCode) {
    if (!emailNorm || !isValidEmail(emailNorm)) {
      return res.status(400).json({ ok: false, message: "请输入注册邮箱" });
    }
    if (!verifySmsCodeOnly(emailNorm, smsCode)) {
      return res.status(400).json({ ok: false, message: "验证码错误或已过期，请重新获取" });
    }
    const user = await prisma.user.findFirst({
      where: { email: emailNorm },
      select: userPublicSelect,
    });
    if (!user) {
      return res.status(404).json({ ok: false, message: "该邮箱尚未注册" });
    }
    consumeSmsCode(emailNorm);
    const token = tokenPayload(user);
    return res.json({
      ok: true,
      data: { user: userResponse(user), token },
    });
  }

  if (password) {
    const id = phoneTrim || emailTrim;
    if (!id) {
      return res.status(400).json({ ok: false, message: "请输入手机号或邮箱" });
    }
    const where = isValidEmail(emailTrim) ? { email: emailNorm } : { phone: phoneTrim };
    const user = await prisma.user.findFirst({ where });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ ok: false, message: "账号或密码错误" });
    }
    const full = await prisma.user.findUnique({
      where: { id: user.id },
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
