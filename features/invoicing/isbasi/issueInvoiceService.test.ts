import { describe, expect, it, vi } from "vitest";

import { issuePaidReportInvoice } from "./issueInvoiceService";

const customer = {
  firstName: "Test", lastName: "Kullanıcı", identityNumber: "11111111111",
  email: "test@example.com", phone: "+905551112233", address: "Test Mahallesi 1",
  city: "İstanbul", district: "Kadıköy",
};

function repository(status: "CLAIMED" | "ISSUED" | "REVIEW_REQUIRED" = "CLAIMED") {
  return {
    claim: vi.fn().mockResolvedValue(status === "CLAIMED"
      ? { status, orderId: "123e4567-e89b-12d3-a456-426614174000", paidAt: new Date("2026-09-02T10:00:00Z") }
      : { status }),
    markIssued: vi.fn().mockResolvedValue(undefined),
    markReviewRequired: vi.fn().mockResolvedValue(undefined),
  };
}

describe("İşbaşı invoice issuance service", () => {
  it("validates sensitive input before claiming an order", async () => {
    const repo = repository();
    await expect(issuePaidReportInvoice({ accessTokenHash: "hash", customer: { ...customer, identityNumber: "bad" }, repository: repo, client: { login: vi.fn(), postAuthenticated: vi.fn() } })).rejects.toThrow();
    expect(repo.claim).not.toHaveBeenCalled();
  });

  it("does not call Logo again for an already claimed order", async () => {
    const repo = repository("REVIEW_REQUIRED");
    const client = { login: vi.fn(), postAuthenticated: vi.fn() };
    await expect(issuePaidReportInvoice({ accessTokenHash: "hash", customer, repository: repo, client })).resolves.toEqual({ status: "REVIEW_REQUIRED" });
    expect(client.login).not.toHaveBeenCalled();
  });

  it("marks a successful provider response issued without storing customer data", async () => {
    const repo = repository();
    const client = {
      login: vi.fn().mockResolvedValue({ accessToken: "token", tenantId: "tenant" }),
      postAuthenticated: vi.fn().mockResolvedValue({ code: 200, isError: false, data: { invoiceId: "invoice-1" } }),
    };
    await expect(issuePaidReportInvoice({ accessTokenHash: "hash", customer, repository: repo, client })).resolves.toEqual({ status: "ISSUED" });
    expect(repo.markIssued).toHaveBeenCalledWith("123e4567-e89b-12d3-a456-426614174000", "invoice-1", expect.any(Date));
    expect(JSON.stringify(repo.markIssued.mock.calls)).not.toContain(customer.identityNumber);
  });

  it("fail-closes an unknown provider outcome and never retries automatically", async () => {
    const repo = repository();
    const client = { login: vi.fn().mockRejectedValue(new Error("network leaked detail")), postAuthenticated: vi.fn() };
    await expect(issuePaidReportInvoice({ accessTokenHash: "hash", customer, repository: repo, client })).resolves.toEqual({ status: "REVIEW_REQUIRED" });
    expect(repo.markReviewRequired).toHaveBeenCalledWith("123e4567-e89b-12d3-a456-426614174000", "ISBASI_PROVIDER_RESULT_UNKNOWN", expect.any(Date));
  });
});
