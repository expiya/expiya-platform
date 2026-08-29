import { createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";

import { initializeIyzicoCheckout, retrieveIyzicoCheckout } from "./checkout";
import { requireIyzicoCallbackUrl } from "./callbackUrl";

const buyer = {
  name: "Ada", surname: "Yılmaz", identityNumber: "11111111111",
  email: "ada@example.com", gsmNumber: "+905350000000",
  billingAddress: { address: "Test Mahallesi No 1", city: "İstanbul", zipCode: "34000" },
};
const sign = (secret: string, values: readonly (string | number)[]) => createHmac("sha256", secret).update(values.join(":"), "utf8").digest("hex");

describe("iyzico checkout contract", () => {
  it("initializes one virtual 349 TL item without transmitting a shipping address", async () => {
    const response = { status: "success" as const, conversationId: "order", token: "token", tokenExpireTime: 1800, paymentPageUrl: "https://sandbox-ode.iyzico.com/token", signature: sign("secret", ["order", "token"]) };
    const post = vi.fn().mockResolvedValue(response);
    await expect(initializeIyzicoCheckout({ client: { post }, secretKey: "secret", orderId: "order", quoteId: "quote", amountKurus: 34_900, callbackUrl: "https://example.com/callback", buyerIp: "127.0.0.1", buyer })).resolves.toEqual(response);
    const request = post.mock.calls[0]?.[1];
    expect(request).toMatchObject({ price: 349, paidPrice: 349, currency: "TRY", enabledInstallments: [1], basketItems: [{ itemType: "VIRTUAL", price: 349 }] });
    expect(request).not.toHaveProperty("shippingAddress");
  });

  it("rejects an invalid initialize signature", async () => {
    const post = vi.fn().mockResolvedValue({ status: "success", conversationId: "order", token: "token", paymentPageUrl: "https://example.com", signature: "0".repeat(64) });
    await expect(initializeIyzicoCheckout({ client: { post }, secretKey: "secret", orderId: "order", quoteId: "quote", amountKurus: 34_900, callbackUrl: "https://example.com/callback", buyerIp: "127.0.0.1", buyer })).rejects.toThrow("IYZICO_INITIALIZE_SIGNATURE_INVALID");
  });

  it("retrieves and binds a successful payment to order, quote, token, TRY and 349 TL", async () => {
    const values = ["SUCCESS", "payment", "TRY", "quote", "order", 349, 349, "token"] as const;
    const response = { status: "success" as const, paymentStatus: "SUCCESS", paymentId: "payment", currency: "TRY", basketId: "quote", conversationId: "order", paidPrice: 349, price: 349, token: "token", signature: sign("secret", values) };
    await expect(retrieveIyzicoCheckout({ client: { post: vi.fn().mockResolvedValue(response) }, secretKey: "secret", orderId: "order", token: "token", quoteId: "quote", expectedAmountKurus: 34_900 })).resolves.toEqual(response);
    await expect(retrieveIyzicoCheckout({ client: { post: vi.fn().mockResolvedValue({ ...response, paidPrice: 348 }) }, secretKey: "secret", orderId: "order", token: "token", quoteId: "quote", expectedAmountKurus: 34_900 })).rejects.toThrow();
  });

  it("requires HTTPS callbacks except localhost sandbox development", () => {
    expect(requireIyzicoCallbackUrl({ IYZICO_CALLBACK_URL: "https://www.expiya.com/api/callback", IYZICO_ENV: "sandbox" })).toBe("https://www.expiya.com/api/callback");
    expect(requireIyzicoCallbackUrl({ IYZICO_CALLBACK_URL: "http://localhost:3000/api/callback", IYZICO_ENV: "sandbox" })).toBe("http://localhost:3000/api/callback");
    expect(() => requireIyzicoCallbackUrl({ IYZICO_CALLBACK_URL: "http://example.com/api/callback", IYZICO_ENV: "sandbox" })).toThrow("IYZICO_CALLBACK_URL_HTTPS_REQUIRED");
  });
});
