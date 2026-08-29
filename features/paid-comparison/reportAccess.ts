import { createHash, randomBytes } from "node:crypto";

export const PAID_REPORT_ACCESS_COOKIE = "expiya_paid_report_access";

export function createPaidReportAccessToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashPaidReportAccessToken(token: string): string {
  if (!/^[A-Za-z0-9_-]{43}$/u.test(token)) throw new TypeError("PAID_REPORT_ACCESS_TOKEN_INVALID");
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function paidReportAccessCookie(token: string, secure: boolean): string {
  hashPaidReportAccessToken(token);
  return `${PAID_REPORT_ACCESS_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${secure ? "; Secure" : ""}`;
}

export function readPaidReportAccessCookie(request: Request): string | undefined {
  const cookies = request.headers.get("cookie") ?? "";
  return cookies.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${PAID_REPORT_ACCESS_COOKIE}=`))?.slice(PAID_REPORT_ACCESS_COOKIE.length + 1);
}
