import { describe, expect, it, vi } from "vitest";

import { PostgresManualCatalogCandidateRepository } from "@/features/vehicle-data/manualCatalogCandidateRepository";
import { parseManualCatalogCandidatesCsv, manualIndexCsvHeaders } from "@/features/vehicle-data/manualCatalogCandidates";

const row = ["SAHIBINDEN", "2026-08-14", "Volkswagen", "Golf", "VII", "Hatchback", "2017", "2020", "DIESEL", "AUTOMATIC", "1.6 TDI 115 PS", "Comfortline", "12", "", "", "MANUEL_TOPLADIM_VE_KULLANIM_YETKIM_VAR"];
const candidate = parseManualCatalogCandidatesCsv(`${manualIndexCsvHeaders.join(",")}\n${row.join(",")}\n`).accepted[0];
const batch = { id: "d2fdb914-a195-45a3-b7bb-3899bad11a14", sourcePlatform: "SAHIBINDEN" as const, suppliedBy: "Serdar Akgül", capturedAt: "2026-08-14", originalFilename: "index.csv", contentSha256: "a".repeat(64), usageAttestation: "MANUEL_TOPLADIM_VE_KULLANIM_YETKIM_VAR" };

describe("PostgresManualCatalogCandidateRepository", () => {
  it("stores candidates and unmatched aliases transactionally", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    query.mockResolvedValueOnce({}).mockResolvedValueOnce({ rows: [{ id: batch.id }] });
    await new PostgresManualCatalogCandidateRepository({ query }).importBatch(batch, [candidate]);
    expect(query.mock.calls.map(([sql]) => String(sql))).toEqual([
      "begin", expect.stringContaining("insert into catalog_candidate_batches"),
      expect.stringContaining("insert into catalog_candidates"), expect.stringContaining("insert into vehicle_aliases"), "commit",
    ]);
  });

  it("treats an already imported content hash as idempotent", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    await new PostgresManualCatalogCandidateRepository({ query }).importBatch(batch, [candidate]);
    expect(query).toHaveBeenCalledTimes(3);
    expect(query).toHaveBeenLastCalledWith("commit");
  });

  it("rolls back failed candidate imports", async () => {
    const query = vi.fn()
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rows: [{ id: batch.id }] })
      .mockRejectedValueOnce(new Error("insert failed"))
      .mockResolvedValueOnce({});
    await expect(new PostgresManualCatalogCandidateRepository({ query }).importBatch(batch, [candidate]))
      .rejects.toThrow("insert failed");
    expect(query).toHaveBeenLastCalledWith("rollback");
  });
});
