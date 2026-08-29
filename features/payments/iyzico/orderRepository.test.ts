import { describe, expect, it, vi } from "vitest";

import { PostgresIyzicoOrderRepository } from "./orderRepository";

describe("PostgresIyzicoOrderRepository", () => {
  it("locks and consumes only an unexpired, exact-price quote", async () => {
    const query = vi.fn()
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rows: [{ id: "quote", amount_kurus: 34_900, currency: "TRY", status: "READY_FOR_CHECKOUT", expires_at: "2026-08-29T10:30:00Z" }] })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({});
    const release = vi.fn();
    const repository = new PostgresIyzicoOrderRepository({ query, connect: async () => ({ query, release }) });
    await expect(repository.createFromQuote({ orderId: "order", quoteId: "quote", now: new Date("2026-08-29T10:00:00Z") }))
      .resolves.toEqual({ orderId: "order", quoteId: "quote", amountKurus: 34_900, currency: "TRY" });
    expect(String(query.mock.calls[1]?.[0])).toContain("for update");
    expect(query.mock.calls.at(-1)?.[0]).toBe("commit");
    expect(release).toHaveBeenCalledOnce();
  });

  it("atomically marks a verified payment paid, queues one report job and consumes the quote", async () => {
    const query = vi.fn()
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rows: [{ quote_id: "quote" }] })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({});
    const release = vi.fn();
    const repository = new PostgresIyzicoOrderRepository({ query, connect: async () => ({ query, release }) });
    await repository.markPaidAndQueue({ orderId: "order", paymentId: "payment", jobId: "job", now: new Date("2026-08-29T10:01:00Z") });
    expect(String(query.mock.calls[1]?.[0])).toContain("status = 'PAID'");
    expect(String(query.mock.calls[2]?.[0])).toContain("comparison_report_jobs");
    expect(String(query.mock.calls[3]?.[0])).toContain("status = 'CONSUMED'");
    expect(query.mock.calls.at(-1)?.[0]).toBe("commit");
  });

  it("keeps uncertain retrieve results out of paid state", async () => {
    const query = vi.fn().mockResolvedValue({});
    const repository = new PostgresIyzicoOrderRepository({ query });
    await repository.markReviewRequired("order");
    expect(String(query.mock.calls[0]?.[0])).toContain("PAYMENT_REVIEW_REQUIRED");
    expect(String(query.mock.calls[0]?.[0])).not.toContain("status = 'PAID'");
  });
});
