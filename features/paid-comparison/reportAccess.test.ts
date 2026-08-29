import { describe, expect, it } from "vitest";
import { createPaidReportAccessToken, hashPaidReportAccessToken, paidReportAccessCookie, readPaidReportAccessCookie } from "./reportAccess";

describe("paid report access", () => {
  it("creates opaque tokens and stores only a stable hash", () => {
    const token = createPaidReportAccessToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/u);
    expect(hashPaidReportAccessToken(token)).toHaveLength(64);
    expect(paidReportAccessCookie(token, true)).toContain("HttpOnly; SameSite=Lax");
  });

  it("reads only the named cookie", () => {
    const token = createPaidReportAccessToken();
    const request = new Request("https://www.expiya.com", { headers: { cookie: `other=x; expiya_paid_report_access=${token}` } });
    expect(readPaidReportAccessCookie(request)).toBe(token);
  });
});
