import { describe, expect, it } from "vitest";
import { assessPaidComparisonReadiness } from "./readiness";

const base = { mode: "sandbox" as const, databaseUrl: "postgres://db", signingSecret: "s".repeat(32), iyzicoApiKey: "sandbox-key", iyzicoSecretKey: "sandbox-secret", callbackUrl: "https://sandbox.example.com/api/payments/iyzico/callback" };
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
});
