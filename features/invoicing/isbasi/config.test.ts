import { describe, expect, it } from "vitest";

import { resolveIsbasiConfig } from "./config";

const credentials = { ISBASI_API_KEY: "test-key", ISBASI_USERNAME: "test@example.com", ISBASI_PASSWORD: "test-password" };

describe("İşbaşı configuration", () => {
  it("defaults to the exact sandbox origin and test login endpoint", () => {
    expect(resolveIsbasiConfig(credentials)).toMatchObject({
      environment: "sandbox",
      baseUrl: "https://soho-isbasi-mwv2-test.logo-paas.com",
      loginPath: "/api/v1.0/user/integrationLogin",
    });
  });

  it("rejects attacker origins, embedded credentials and sandbox/live confusion", () => {
    expect(() => resolveIsbasiConfig({ ...credentials, ISBASI_API_BASE_URL: "https://evil.example" })).toThrow("ISBASI_PROVIDER_ORIGIN_REQUIRED");
    expect(() => resolveIsbasiConfig({ ...credentials, ISBASI_API_BASE_URL: "https://user:pass@soho-isbasi-mwv2-test.logo-paas.com" })).toThrow("ISBASI_BASE_URL_INVALID");
    expect(() => resolveIsbasiConfig({ ...credentials, ISBASI_ENV: "live", ISBASI_API_BASE_URL: "https://api.example.com" })).toThrow("ISBASI_LIVE_INVOICING_DISABLED");
    expect(() => resolveIsbasiConfig({ ...credentials, ISBASI_ENV: "live", ISBASI_LIVE_INVOICING_ENABLED: "true", ISBASI_API_BASE_URL: "https://api.example.com" })).toThrow("ISBASI_PROVIDER_ORIGIN_REQUIRED");
  });

  it("accepts only Logo's confirmed live origin when the explicit live gate is open", () => {
    expect(resolveIsbasiConfig({
      ...credentials,
      ISBASI_ENV: "live",
      ISBASI_LIVE_INVOICING_ENABLED: "true",
      ISBASI_API_BASE_URL: "https://lite-mw.isbasi.com",
    })).toMatchObject({
      environment: "live",
      baseUrl: "https://lite-mw.isbasi.com",
      loginPath: "/api/v1.0/user/integrationLogin",
    });
  });
});
