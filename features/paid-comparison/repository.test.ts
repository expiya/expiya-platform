import { describe, expect, it, vi } from "vitest";

import type { ComparisonReportQuote } from "./contracts";
import { PostgresPaidComparisonQuoteRepository } from "./repository";

const quote: ComparisonReportQuote = {
  id: "11111111-1111-4111-8111-111111111111",
  productCode: "CARS_COMPARISON_3",
  conversationId: "conversation",
  decisionId: "decision",
  approvedNeeds: [{ concept: "primaryUsage", summary: "Ana kullanım: şehir" }],
  catalogReleaseVersion: "1.0.0",
  catalogFingerprint: "fingerprint",
  vehicles: [
    { exactVariantId: "decision", role: "DECISION_CARD" },
    { exactVariantId: "one", role: "ALTERNATIVE_1" },
    { exactVariantId: "two", role: "ALTERNATIVE_2" },
  ],
  amountKurus: 34_900,
  currency: "TRY",
  taxIncluded: true,
  status: "READY_FOR_CHECKOUT",
  createdAt: "2026-08-29T10:00:00.000Z",
  expiresAt: "2026-08-29T10:30:00.000Z",
};

describe("PostgresPaidComparisonQuoteRepository", () => {
  it("persists the immutable quote and exactly three vehicle roles in one transaction", async () => {
    const query = vi.fn().mockResolvedValue({});
    const release = vi.fn();
    await new PostgresPaidComparisonQuoteRepository({ connect: async () => ({ query, release }), query }).createQuote(quote);
    expect(query.mock.calls[0]?.[0]).toBe("begin");
    expect(query.mock.calls.some(([sql]) => sql === "commit")).toBe(true);
    expect(String(query.mock.calls.at(-1)?.[0])).toContain("QUOTE_CREATED");
    expect(query.mock.calls.filter(([sql]) => String(sql).includes("comparison_report_quote_vehicles"))).toHaveLength(3);
    expect(release).toHaveBeenCalledOnce();
  });

  it("rolls back and releases the connection on a persistence failure", async () => {
    const query = vi.fn()
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error("insert failed"))
      .mockResolvedValueOnce({});
    const release = vi.fn();
    await expect(new PostgresPaidComparisonQuoteRepository({ connect: async () => ({ query, release }), query }).createQuote(quote))
      .rejects.toThrow("insert failed");
    expect(query).toHaveBeenLastCalledWith("rollback");
    expect(release).toHaveBeenCalledOnce();
  });
});
