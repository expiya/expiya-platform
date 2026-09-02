import { describe, expect, it, vi } from "vitest";

import { createIsbasiHttpClient } from "./httpClient";

const config = {
  environment: "sandbox" as const,
  baseUrl: "https://soho-isbasi-mwv2-test.logo-paas.com",
  loginPath: "/api/v1.0/user/integrationLogin" as const,
  apiKey: "test-api-key",
  username: "test@example.com",
  password: "test-password",
};

describe("İşbaşı HTTP client", () => {
  it("logs in without exposing credentials and binds authenticated calls to the configured origin", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ isError: false, data: { access_token: "token", tenantId: "tenant" } }), { status: 200, headers: { "content-type": "application/json" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ isError: false, data: { invoiceId: "invoice-1" } }), { status: 200, headers: { "content-type": "application/json" } }));
    const client = createIsbasiHttpClient(config, fetcher);
    const session = await client.login();
    await client.postAuthenticated("/api/v1.0/invoices/integrationInvoices", { invoiceId: 0 }, session);

    expect(fetcher.mock.calls[0]?.[0]).toBe(`${config.baseUrl}${config.loginPath}`);
    expect(fetcher.mock.calls[1]?.[0]).toBe(`${config.baseUrl}/api/v1.0/invoices/integrationInvoices`);
    expect(fetcher.mock.calls[1]?.[1]).toMatchObject({ redirect: "error", cache: "no-store" });
    expect(new Headers(fetcher.mock.calls[1]?.[1]?.headers).get("Authorization")).toBe("Bearer token");
  });

  it("rejects endpoint escape, non-JSON and oversized responses with redacted errors", async () => {
    const client = createIsbasiHttpClient(config, vi.fn().mockResolvedValue(new Response("<html>secret</html>", { status: 200, headers: { "content-type": "text/html" } })));
    await expect(client.postAuthenticated("https://evil.example", {}, { accessToken: "secret-token", tenantId: "tenant" })).rejects.toThrow("ISBASI_PATH_INVALID");
    await expect(client.postAuthenticated("/safe", {}, { accessToken: "secret-token", tenantId: "tenant" })).rejects.toThrow("ISBASI_RESPONSE_CONTENT_TYPE_INVALID");

    const oversized = createIsbasiHttpClient(config, vi.fn().mockResolvedValue(new Response("{}", { status: 200, headers: { "content-type": "application/json", "content-length": "128001" } })));
    await expect(oversized.postAuthenticated("/safe", {}, { accessToken: "secret-token", tenantId: "tenant" })).rejects.toThrow("ISBASI_RESPONSE_TOO_LARGE");
  });
});
