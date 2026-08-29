import { describe, expect, it } from "vitest";

import { resolveIyzicoConfig } from "./config";
import { createIyzicoCheckoutWebhookSignature, verifyIyzicoCheckoutWebhookSignature } from "./webhookSignature";

describe("iyzico security boundary", () => {
  it("defaults to sandbox and refuses live-shaped credentials", () => {
    expect(() => resolveIyzicoConfig({ IYZICO_API_KEY: "live-key", IYZICO_SECRET_KEY: "live-secret" }))
      .toThrow("IYZICO_SANDBOX_CREDENTIALS_REQUIRED");
    expect(resolveIyzicoConfig({ IYZICO_API_KEY: "sandbox-key", IYZICO_SECRET_KEY: "sandbox-secret" }).baseUrl)
      .toBe("https://sandbox-api.iyzipay.com");
  });

  it("keeps live payments disabled without an explicit server-side gate", () => {
    expect(() => resolveIyzicoConfig({ IYZICO_ENV: "live", IYZICO_API_KEY: "key", IYZICO_SECRET_KEY: "secret" }))
      .toThrow("IYZICO_LIVE_PAYMENTS_DISABLED");
    expect(resolveIyzicoConfig({
      IYZICO_ENV: "live",
      IYZICO_API_KEY: "key",
      IYZICO_SECRET_KEY: "secret",
      IYZICO_LIVE_PAYMENTS_ENABLED: "true",
    }).baseUrl).toBe("https://api.iyzipay.com");
  });

  it("validates checkout-form webhook V3 signatures and rejects tampering", () => {
    const payload = {
      iyziEventType: "CHECKOUT_FORM_AUTH",
      iyziPaymentId: "payment-1",
      token: "token-1",
      paymentConversationId: "order-1",
      status: "SUCCESS",
    };
    const signature = createIyzicoCheckoutWebhookSignature("sandbox-secret", payload);
    expect(verifyIyzicoCheckoutWebhookSignature({ secretKey: "sandbox-secret", signature, payload })).toBe(true);
    expect(verifyIyzicoCheckoutWebhookSignature({ secretKey: "sandbox-secret", signature, payload: { ...payload, status: "FAILURE" } })).toBe(false);
    expect(verifyIyzicoCheckoutWebhookSignature({ secretKey: "sandbox-secret", signature: "invalid", payload })).toBe(false);
  });
});
