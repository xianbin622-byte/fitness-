import type { Request, Response, NextFunction } from "express";
import { verifyToken, type JwtPayload } from "../lib/jwt";

export type AuthedRequest = Request & { user?: JwtPayload };

export function authMiddleware(req: AuthedRequest, res: Response, next: NextFunction) {
  const h = req.headers.authorization;
  if (!h?.startsWith("Bearer ")) {
    return res.status(401).json({ ok: false, message: "未登录或令牌无效" });
  }
  const token = h.slice(7);
  try {
    req.user = verifyToken(token);
    next();
  } catch {
    return res.status(401).json({ ok: false, message: "登录已过期，请重新登录" });
  }
}

export function requireRole(...roles: Array<"MEMBER" | "COACH">) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ ok: false, message: "未登录" });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ ok: false, message: "无权访问该资源" });
    }
    next();
  };
}
