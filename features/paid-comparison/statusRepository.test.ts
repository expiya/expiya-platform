import { describe, expect, it, vi } from "vitest";
import { PostgresPaidReportStatusRepository } from "./statusRepository";

describe("PostgresPaidReportStatusRepository", () => {
  it("reveals status only through the opaque token hash and maps success to ready", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [{ status: "SUCCEEDED" }] });
    const result = await new PostgresPaidReportStatusRepository({ query }).findByAccessTokenHash("a".repeat(64));
    expect(result).toEqual({ status: "READY" });
    expect(query.mock.calls[0]?.[1]).toEqual(["a".repeat(64)]);
    expect(String(query.mock.calls[0]?.[0])).not.toContain("provider_payment_id");
  });
});
