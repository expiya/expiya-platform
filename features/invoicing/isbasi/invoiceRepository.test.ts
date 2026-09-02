import { describe, expect, it, vi } from "vitest";

import { PostgresPaidReportInvoiceRepository } from "./invoiceRepository";

describe("İşbaşı invoice repository", () => {
  it("uses an order unique insert as the concurrency/idempotency claim", async () => {
    const query = vi.fn()
      .mockResolvedValueOnce({ rows: [{ order_id: "order-1" }] })
      .mockResolvedValueOnce({ rows: [{ paid_at: "2026-09-02T10:00:00Z" }] });
    const result = await new PostgresPaidReportInvoiceRepository({ query }).claim("token-hash", new Date("2026-09-02T11:00:00Z"));
    expect(result).toEqual({ status: "CLAIMED", orderId: "order-1", paidAt: new Date("2026-09-02T10:00:00Z") });
    expect(query.mock.calls[0]?.[0]).toContain("on conflict (order_id) do nothing");
    expect(query.mock.calls.flat().join(" ")).not.toContain("identityNumber");
  });

  it("maps a concurrent PROCESSING claim to manual review without another write", async () => {
    const query = vi.fn().mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [{ status: "PROCESSING" }] });
    await expect(new PostgresPaidReportInvoiceRepository({ query }).claim("token-hash", new Date())).resolves.toEqual({ status: "REVIEW_REQUIRED" });
  });
});
