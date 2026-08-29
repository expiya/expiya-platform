import { describe, expect, it, vi } from "vitest";
import { PostgresPaidComparisonReportDocumentRepository } from "./reportDocumentRepository";

describe("paid comparison report document access", () => {
  it("requires paid order, succeeded job and opaque access hash", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [{ document: { schemaVersion: "paid-comparison-report/v1" } }] });
    const result = await new PostgresPaidComparisonReportDocumentRepository({ query }).findByAccessTokenHash("a".repeat(64));
    expect(result).toEqual({ schemaVersion: "paid-comparison-report/v1" });
    expect(String(query.mock.calls[0]?.[0])).toContain("j.status = 'SUCCEEDED'");
    expect(query.mock.calls[0]?.[1]).toEqual(["a".repeat(64)]);
  });
});
