import { beforeEach, describe, expect, it } from "vitest";

import { appendSalesAdvisorHistory, getSalesAdvisorHistory, resetSalesAdvisorHistoryForTests, salesAdvisorHistoryKey } from "./history.server";

describe("Phase 2 conversation-scoped history", () => {
  beforeEach(resetSalesAdvisorHistoryForTests);

  it("is isolated by conversation, offer and exact variant and capped at 12 messages", () => {
    const key = salesAdvisorHistoryKey("conversation-a", "offer-a", "variant-a");
    appendSalesAdvisorHistory(key, Array.from({ length: 14 }, (_, index) => ({ role: "user" as const, text: String(index) })), "2026-08-28T12:00:00.000Z", Date.parse("2026-08-28T10:00:00.000Z"));
    expect(getSalesAdvisorHistory(key, Date.parse("2026-08-28T11:00:00.000Z"))).toHaveLength(12);
    expect(getSalesAdvisorHistory(salesAdvisorHistoryKey("conversation-b", "offer-a", "variant-a"))).toEqual([]);
  });

  it("deletes history when the signed handoff expires", () => {
    const key = salesAdvisorHistoryKey("conversation-a", "offer-a", "variant-a");
    appendSalesAdvisorHistory(key, [{ role: "user", text: "Soru" }], "2026-08-28T11:00:00.000Z", Date.parse("2026-08-28T10:00:00.000Z"));
    expect(getSalesAdvisorHistory(key, Date.parse("2026-08-28T11:00:00.000Z"))).toEqual([]);
  });
});
