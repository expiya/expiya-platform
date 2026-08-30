import { describe, expect, it } from "vitest";
import { buildIyzicoCallbackRedirect } from "./callbackResponse";

describe("iyzico callback redirect", () => {
  it("creates mutable success headers atomically and keeps the configured public origin", () => {
    const response = buildIyzicoCallbackRedirect({ requestUrl: "http://localhost:4051/api/payments/iyzico/callback", configuredCallbackUrl: "http://127.0.0.1:4051/api/payments/iyzico/callback", outcome: "success", accessCookie: "paid_access=test; Path=/; HttpOnly" });
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("http://127.0.0.1:4051/cars/paid-comparison/status?payment=success");
    expect(response.headers.get("set-cookie")).toContain("paid_access=test");
  });
});
