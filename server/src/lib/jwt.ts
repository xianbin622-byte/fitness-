import jwt, { type SignOptions } from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

export type JwtPayload = {
  sub: string;
  role: "MEMBER" | "COACH";
  phone: string;
};

export function signToken(payload: JwtPayload, expiresIn: SignOptions["expiresIn"] = "7d"): string {
  const opts: SignOptions = { expiresIn };
  return jwt.sign(payload, JWT_SECRET, opts);
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}
