import { describe, expect, it } from "vitest";

import { enforceRateLimit, readJsonWithLimit, verifySameOrigin } from "./requestSecurity";

function request(overrides: RequestInit = {}) {
  return new Request("https://expiya.com/api/test", { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": crypto.randomUUID(), ...overrides.headers }, body: overrides.body ?? "{}" });
}

describe("request security", () => {
  it("rejects cross-origin browser writes", () => {
    expect(verifySameOrigin(request({ headers: { "content-type": "application/json", origin: "https://evil.example" } }))?.status).toBe(403);
  });

  it("rejects non-JSON writes", () => {
    expect(verifySameOrigin(request({ headers: { "content-type": "text/plain" } }))?.status).toBe(415);
  });

  it("limits repeated requests per client and scope", () => {
    const input = request({ headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.17" } });
    expect(enforceRateLimit(input, "test", 1, 60_000)).toBeUndefined();
    expect(enforceRateLimit(input, "test", 1, 60_000)?.status).toBe(429);
  });

  it("rejects request bodies over the byte limit", async () => {
    await expect(readJsonWithLimit(request({ body: JSON.stringify({ value: "x".repeat(100) }) }), 20)).rejects.toThrow("REQUEST_BODY_TOO_LARGE");
  });
});
