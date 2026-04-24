const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  const e = (email || "").trim();
  return e.length <= 254 && EMAIL_RE.test(e);
}
