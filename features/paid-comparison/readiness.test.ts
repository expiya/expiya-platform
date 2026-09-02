import { describe, expect, it } from "vitest";
import { assessPaidComparisonEnvironment, assessPaidComparisonReadiness } from "./readiness";

const base = { mode: "sandbox" as const, databaseUrl: "postgres://db", signingSecret: "s".repeat(32), iyzicoApiKey: "sandbox-key", iyzicoSecretKey: "sandbox-secret", callbackUrl: "https://sandbox.example.com/api/payments/iyzico/callback", piiEncryptionKey: Buffer.alloc(32, 1).toString("base64url"), resendApiKey: "re_test", reportFromEmail: "Expiya Cars <rapor@example.com>", internalNotificationEmail: "serdar@expiya.com" };
describe("paid comparison readiness", () => {
  it("allows sandbox validation without pretending legal launch approval exists", () => {
    expect(assessPaidComparisonReadiness(base)).toEqual({ mode: "sandbox", ready: true, failures: [] });
  });
  it("requires every independent live gate", () => {
    const result = assessPaidComparisonReadiness({ ...base, mode: "live", iyzicoApiKey: "live-key", iyzicoSecretKey: "live-secret" });
    expect(result.ready).toBe(false);
    expect(result.failures).toEqual(["LIVE_GATE_DISABLED", "LEGAL_APPROVAL_MISSING", "INVOICE_PROCESS_NOT_READY", "SANDBOX_E2E_NOT_ATTESTED"]);
  });
  it("rejects non-HTTPS callbacks and live credentials in sandbox", () => {
    expect(assessPaidComparisonReadiness({ ...base, iyzicoApiKey: "live", iyzicoSecretKey: "live", callbackUrl: "http://localhost/callback" }).failures)
      .toEqual(["IYZICO_SANDBOX_CREDENTIALS_INVALID", "CALLBACK_URL_INVALID"]);
  });

  it("does not accept an invoice-ready flag without a live İşbaşı provider gate", () => {
    const environment = {
      NODE_ENV: "test" as const,
      DATABASE_URL: "postgres://db",
      CARS_DECISION_V2_SIGNING_SECRET: "s".repeat(32),
      IYZICO_ENV: "live",
      IYZICO_API_KEY: "live-key",
      IYZICO_SECRET_KEY: "live-secret",
      IYZICO_CALLBACK_URL: "https://www.expiya.com/api/payments/iyzico/callback",
      IYZICO_LIVE_PAYMENTS_ENABLED: "true",
      PAID_COMPARISON_LEGAL_APPROVED: "true",
      PAID_COMPARISON_SANDBOX_E2E_PASSED: "true",
      SKYBIT_INVOICE_PROCESS_READY: "true",
      PAID_REPORT_PII_KEY: Buffer.alloc(32, 1).toString("base64url"),
      RESEND_API_KEY: "re_test",
      PAID_REPORT_FROM_EMAIL: "rapor@example.com",
      PAID_REPORT_INTERNAL_NOTIFICATION_EMAIL: "internal@example.com",
    };
    expect(assessPaidComparisonEnvironment(environment).failures).toContain("INVOICE_PROCESS_NOT_READY");
  });
});
