import { createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";

import { createIyzicoHttpClient, createIyzicoV2Authorization } from "./httpClient";

describe("iyzico IYZWSv2 HTTP client", () => {
  it("creates the documented HMACSHA256 authorization envelope", () => {
    const body = JSON.stringify({ conversationId: "order-1" });
    const authorization = createIyzicoV2Authorization({ apiKey: "sandbox-key", secretKey: "sandbox-secret", path: "/payment/test", body, randomKey: "123" });
    const signature = createHmac("sha256", "sandbox-secret").update(`123/payment/test${body}`).digest("hex");
    expect(authorization).toBe(`IYZWSv2 ${Buffer.from(`apiKey:sandbox-key&randomKey:123&signature:${signature}`).toString("base64")}`);
  });

  it("posts only to the configured sandbox origin and rejects provider failures", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ status: "success", token: "token" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: "failure", errorCode: "bad" }), { status: 200 }));
    const client = createIyzicoHttpClient({ environment: "sandbox", baseUrl: "https://sandbox-api.iyzipay.com", apiKey: "sandbox-key", secretKey: "sandbox-secret" }, fetcher);
    await expect(client.post("/payment/test", { value: 1 })).resolves.toEqual({ status: "success", token: "token" });
    expect(fetcher.mock.calls[0]?.[0]).toBe("https://sandbox-api.iyzipay.com/payment/test");
    await expect(client.post("/payment/test", { value: 1 })).rejects.toThrow("IYZICO_API_bad");
  });

  it("rejects paths that could escape the signed endpoint", () => {
    expect(() => createIyzicoV2Authorization({ apiKey: "a", secretKey: "s", path: "https://evil.test", body: "{}", randomKey: "1" }))
      .toThrow("IYZICO_PATH_INVALID");
    expect(() => createIyzicoV2Authorization({ apiKey: "a", secretKey: "s", path: "/payment?x=1", body: "{}", randomKey: "1" }))
      .toThrow("IYZICO_PATH_INVALID");
  });
});
