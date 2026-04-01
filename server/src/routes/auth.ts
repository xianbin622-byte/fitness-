import crypto from "crypto";
import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { signToken } from "../lib/jwt";
import type { AuthedRequest } from "../middleware/auth";
import { authMiddleware } from "../middleware/auth";
import { issueSmsCode, verifySmsCodeOnly, consumeSmsCode } from "../services/smsCode";

const r = Router();

function tokenPayload(user: { id: string; role: string; phone: string }) {
  return signToken({ sub: user.id, role: user.role as "MEMBER" | "COACH", phone: user.phone });
}

function userResponse(user: {
  id: string;
  phone: string;
  nickname: string;
  role: string;
  avatar: string | null;
}) {
  return {
    id: user.id,
    phone: user.phone,
    nickname: user.nickname,
    role: user.role,
    avatar: user.avatar,
  };
}

/** 发送短信验证码（MVP：内存存储；生产需接短信服务商） */
r.post("/sms/send", async (req, res) => {
  const { phone } = req.body as { phone?: string };
  if (!phone?.trim()) {
    return res.status(400).json({ ok: false, message: "请填写手机号" });
  }
  const result = issueSmsCode(phone);
  if (!result.ok) {
    return res.status(400).json({ ok: false, message: result.message });
  }
  return res.json({
    ok: true,
    message: "验证码已发送",
    ...(result.debugCode ? { debugCode: result.debugCode } : {}),
  });
});

/** 注册：短信验证码 + 昵称 + 角色（不再使用密码） */
r.post("/register", async (req, res) => {
  const { phone, smsCode, nickname, role } = req.body as {
    phone?: string;
    smsCode?: string;
    nickname?: string;
    role?: "MEMBER" | "COACH";
  };
  if (!phone || !smsCode || !nickname || !role) {
    return res.status(400).json({ ok: false, message: "请填写手机号、验证码、昵称并选择角色" });
  }
  if (!["MEMBER", "COACH"].includes(role)) {
    return res.status(400).json({ ok: false, message: "角色无效" });
  }
  if (!verifySmsCodeOnly(phone, smsCode)) {
    return res.status(400).json({ ok: false, message: "验证码错误或已过期，请重新获取" });
  }
  const exists = await prisma.user.findUnique({ where: { phone: phone.trim() } });
  if (exists) {
    return res.status(409).json({ ok: false, message: "该手机号已注册，请直接登录" });
  }
  const passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 10);
  const user = await prisma.user.create({
    data: { phone: phone.trim(), nickname, role, passwordHash },
    select: { id: true, phone: true, nickname: true, role: true, avatar: true, createdAt: true },
  });
  consumeSmsCode(phone);
  const token = tokenPayload(user);
  return res.json({ ok: true, data: { user, token } });
});

/**
 * 登录：
 * - 推荐：手机号 + 短信验证码（smsCode）
 * - 兼容种子账号：手机号 + 密码（password）
 */
r.post("/login", async (req, res) => {
  const { phone, smsCode, password } = req.body as {
    phone?: string;
    smsCode?: string;
    password?: string;
  };
  if (!phone?.trim()) {
    return res.status(400).json({ ok: false, message: "请输入手机号" });
  }
  const phoneNorm = phone.trim();

  if (smsCode) {
    if (!verifySmsCodeOnly(phoneNorm, smsCode)) {
      return res.status(400).json({ ok: false, message: "验证码错误或已过期，请重新获取" });
    }
    const user = await prisma.user.findUnique({ where: { phone: phoneNorm } });
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
      return res.status(401).json({ ok: false, message: "手机号或密码错误" });
    }
    const token = tokenPayload(user);
    return res.json({
      ok: true,
      data: { user: userResponse(user), token },
    });
  }

  return res.status(400).json({ ok: false, message: "请使用验证码登录，或填写密码（演示种子账号）" });
});

/** 当前用户信息 */
r.get("/me", authMiddleware, async (req: AuthedRequest, res) => {
  const u = await prisma.user.findUnique({
    where: { id: req.user!.sub },
    select: { id: true, phone: true, nickname: true, role: true, avatar: true, createdAt: true },
  });
  if (!u) return res.status(404).json({ ok: false, message: "用户不存在" });
  return res.json({ ok: true, data: u });
});

export const authRouter = r;
