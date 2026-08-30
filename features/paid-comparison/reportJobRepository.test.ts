import { describe, expect, it, vi } from "vitest";
import { PostgresPaidComparisonReportJobRepository } from "./reportJobRepository";

describe("PostgresPaidComparisonReportJobRepository", () => {
  it("claims with skip-locked semantics and preserves vehicle role order", async () => {
    const query = vi.fn()
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rows: [{ id: "job" }] })
      .mockResolvedValueOnce({ rows: [{ job_id: "job", order_id: "order", quote_id: "quote", catalog_release_version: "1", catalog_fingerprint: "fp", approved_needs: [{ concept: "x", summary: "y" }], exact_variant_ids: ["decision", "one", "two"] }] })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({});
    const result = await new PostgresPaidComparisonReportJobRepository({ query }).claim(new Date("2026-08-29T10:00:00Z"));
    expect(result?.exactVariantIds).toEqual(["decision", "one", "two"]);
    expect(String(query.mock.calls[1]?.[0])).toContain("skip locked");
    expect(String(query.mock.calls[2]?.[0])).toContain("DECISION_CARD");
  });

  it("publishes the document and success transition in one transaction", async () => {
    const query = vi.fn().mockResolvedValueOnce({}).mockResolvedValueOnce({}).mockResolvedValueOnce({ rows: [{ id: "job" }] }).mockResolvedValueOnce({});
    const repository = new PostgresPaidComparisonReportJobRepository({ query });
    const job = { jobId: "job", orderId: "order", quoteId: "quote", catalogReleaseVersion: "1", catalogFingerprint: "fp", approvedNeeds: [], exactVariantIds: ["a", "b", "c"] as const };
    await repository.complete({ job, reportId: "report", document: { ok: true }, generatedAt: new Date("2026-08-29T10:00:00Z") });
    expect(String(query.mock.calls[1]?.[0])).toContain("comparison_report_documents");
    expect(String(query.mock.calls[2]?.[0])).toContain("SUCCEEDED");
    expect(String(query.mock.calls[3]?.[0])).toContain("paid_report_vehicle_entitlements");
    expect(String(query.mock.calls[4]?.[0])).toContain("REPORT_READY");
    expect(String(query.mock.calls[5]?.[0])).toContain("paid_report_email_outbox");
  });
});
