import { afterEach, describe, expect, it, vi } from "vitest";

import { enforceRateLimit, readJsonWithLimit, verifySameOrigin } from "./requestSecurity";

function request(overrides: RequestInit = {}) {
  return new Request("https://expiya.com/api/test", { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": crypto.randomUUID(), ...overrides.headers }, body: overrides.body ?? "{}" });
}

describe("request security", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });
  it("rejects cross-origin browser writes", () => {
    expect(verifySameOrigin(request({ headers: { "content-type": "application/json", origin: "https://evil.example" } }))?.status).toBe(403);
  });

  it("accepts localhost and IPv4 loopback aliases on the same development port", () => {
    const local = new Request("http://localhost:4051/api/test", { method: "POST", headers: { "content-type": "application/json", origin: "http://127.0.0.1:4051" }, body: "{}" });
    expect(verifySameOrigin(local)).toBeUndefined();
  });

  it("rejects a loopback alias on another port", () => {
    const local = new Request("http://localhost:4051/api/test", { method: "POST", headers: { "content-type": "application/json", origin: "http://127.0.0.1:4052" }, body: "{}" });
    expect(verifySameOrigin(local)?.status).toBe(403);
  });

  it("rejects non-JSON writes", () => {
    expect(verifySameOrigin(request({ headers: { "content-type": "text/plain" } }))?.status).toBe(415);
  });

  it("limits repeated requests per client and scope", async () => {
    const input = request({ headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.17" } });
    await expect(enforceRateLimit(input, { scope: "test", limit: 1, windowMs: 60_000 })).resolves.toBeUndefined();
    expect((await enforceRateLimit(input, { scope: "test", limit: 1, windowMs: 60_000 }))?.status).toBe(429);
  });

  it("rejects request bodies over the byte limit", async () => {
    await expect(readJsonWithLimit(request({ body: JSON.stringify({ value: "x".repeat(100) }) }), 20)).rejects.toThrow("REQUEST_BODY_TOO_LARGE");
  });

  it("uses the shared Redis counter when configured", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://redis.example");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "test-token");
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ result: [2, 30_000] }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await enforceRateLimit(request(), { scope: "distributed", limit: 1, windowMs: 60_000 });

    expect(response?.status).toBe(429);
    expect(fetchMock).toHaveBeenCalledWith("https://redis.example", expect.objectContaining({ method: "POST", cache: "no-store" }));
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string) as string[];
    expect(body.slice(0, 3)).toEqual(["EVAL", expect.any(String), "1"]);
  });
});
