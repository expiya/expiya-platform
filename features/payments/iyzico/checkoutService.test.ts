import { describe, expect, it, vi } from "vitest";

import type { IyzicoOrderRepository } from "./orderRepository";
import { finalizeIyzicoCheckout, startIyzicoCheckout } from "./checkoutService";
import { createHmac } from "node:crypto";
import { paidComparisonLegalArtifacts, type PaidComparisonLegalAcceptance } from "@/features/paid-comparison/legalArtifacts";

const buyer = { name: "Ada", surname: "Yılmaz", identityNumber: "11111111111", email: "ada@example.com", gsmNumber: "+905350000000", billingAddress: { address: "Test Mahallesi No 1", city: "İstanbul" } };
const signature = (values: readonly (string | number)[]) => createHmac("sha256", "secret").update(values.join(":"), "utf8").digest("hex");
const legalAcceptance = (acceptedAt = "2026-08-29T10:00:00.000Z"): PaidComparisonLegalAcceptance => ({
  preInformationVersion: paidComparisonLegalArtifacts.preInformation.version,
  distanceContractVersion: paidComparisonLegalArtifacts.distanceContract.version,
  immediatePerformanceVersion: paidComparisonLegalArtifacts.immediatePerformance.version,
  preInformationAccepted: true, distanceContractAccepted: true, immediatePerformanceAccepted: true, acceptedAt,
});

function repository(): IyzicoOrderRepository {
  return {
    createFromQuote: vi.fn().mockResolvedValue({ orderId: "order", quoteId: "quote", amountKurus: 34_900, currency: "TRY" }),
    markInitialized: vi.fn().mockResolvedValue(undefined),
    markFailed: vi.fn().mockResolvedValue(undefined),
    markReviewRequired: vi.fn().mockResolvedValue(undefined),
    findPendingByToken: vi.fn().mockResolvedValue({ orderId: "order", quoteId: "quote", providerToken: "token", amountKurus: 34_900, currency: "TRY" }),
    markPaidAndQueue: vi.fn().mockResolvedValue(undefined),
    grantReportAccess: vi.fn().mockResolvedValue(undefined),
  };
}

describe("iyzico checkout service", () => {
  it("persists initialization only after a signed provider response", async () => {
    const repo = repository();
    const client = { post: vi.fn().mockResolvedValue({ status: "success", conversationId: "order", token: "token", tokenExpireTime: 1800, paymentPageUrl: "https://sandbox.example/token", signature: signature(["order", "token"]) }) };
    await expect(startIyzicoCheckout({ quoteId: "quote", buyer, buyerIp: "127.0.0.1", callbackUrl: "https://example.com/callback", secretKey: "secret", client, repository: repo, legalAcceptance: legalAcceptance(), subjectHash: "a".repeat(24), orderId: "order", now: new Date("2026-08-29T10:00:00Z") })).resolves.toEqual({ orderId: "order", paymentPageUrl: "https://sandbox.example/token", expiresAt: "2026-08-29T10:30:00.000Z" });
    expect(repo.markInitialized).toHaveBeenCalledWith({ orderId: "order", token: "token", expiresAt: new Date("2026-08-29T10:30:00.000Z") });
  });

  it("queues a report only after signed retrieve and exact amount binding", async () => {
    const repo = repository();
    const values = ["SUCCESS", "payment", "TRY", "quote", "order", 349, 349, "token"] as const;
    const client = { post: vi.fn().mockResolvedValue({ status: "success", paymentStatus: "SUCCESS", paymentId: "payment", currency: "TRY", basketId: "quote", conversationId: "order", paidPrice: 349, price: 349, token: "token", signature: signature(values) }) };
    await expect(finalizeIyzicoCheckout({ token: "token", secretKey: "secret", client, repository: repo, jobId: "job", now: new Date("2026-08-29T10:01:00Z") })).resolves.toEqual({ orderId: "order", status: "PAID" });
    expect(repo.markPaidAndQueue).toHaveBeenCalledWith({ orderId: "order", paymentId: "payment", jobId: "job", now: new Date("2026-08-29T10:01:00Z") });
  });

  it("marks the order failed when provider verification fails", async () => {
    const repo = repository();
    const client = { post: vi.fn().mockResolvedValue({ status: "success", conversationId: "order", token: "token", paymentPageUrl: "https://example.com", signature: "0".repeat(64) }) };
    await expect(startIyzicoCheckout({ quoteId: "quote", buyer, buyerIp: "127.0.0.1", callbackUrl: "https://example.com/callback", secretKey: "secret", client, repository: repo, legalAcceptance: legalAcceptance(), subjectHash: "a".repeat(24), orderId: "order", now: new Date("2026-08-29T10:00:00Z") })).rejects.toThrow();
    expect(repo.markFailed).toHaveBeenCalledWith("order");
  });

  it("requires review instead of declaring failure when retrieve verification is uncertain", async () => {
    const repo = repository();
    const client = { post: vi.fn().mockResolvedValue({ status: "success", paymentStatus: "SUCCESS", paymentId: "payment", currency: "TRY", basketId: "quote", conversationId: "order", paidPrice: 349, price: 349, token: "token", signature: "0".repeat(64) }) };
    await expect(finalizeIyzicoCheckout({ token: "token", secretKey: "secret", client, repository: repo })).rejects.toThrow();
    expect(repo.markReviewRequired).toHaveBeenCalledWith("order");
    expect(repo.markFailed).not.toHaveBeenCalled();
    expect(repo.markPaidAndQueue).not.toHaveBeenCalled();
  });
});
