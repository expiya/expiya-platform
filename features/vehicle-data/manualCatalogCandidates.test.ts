import { describe, expect, it } from "vitest";

import { manualIndexCsvHeaders, normalizeCatalogToken, parseManualCatalogCandidatesCsv } from "@/features/vehicle-data/manualCatalogCandidates";

const csv = (row: readonly string[]) => `${manualIndexCsvHeaders.join(",")}\n${row.join(",")}\n`;
const validRow = ["SAHIBINDEN", "2026-08-14", "Volkswagen", "Golf", "VII", "Hatchback", "2017", "2020", "DIESEL", "AUTOMATIC", "1.6 TDI 115 PS", "Comfortline", "12", "", "", "MANUEL_TOPLADIM_VE_KULLANIM_YETKIM_VAR"];

describe("parseManualCatalogCandidatesCsv", () => {
  it("normalizes a manually supplied taxonomy row without treating it as a publishable vehicle", () => {
    const report = parseManualCatalogCandidatesCsv(csv(validRow));
    expect(report.rejected).toEqual([]);
    expect(report.accepted[0]).toMatchObject({
      sourceRowNumber: 2, sourcePlatform: "SAHIBINDEN", normalizedBrand: "volkswagen",
      normalizedModel: "golf", occurrenceCount: 12, yearFrom: 2017, yearUntil: 2020,
    });
    expect(report.accepted[0].fingerprint).toMatch(/^[a-f0-9]{64}$/);
  });

  it("retains quoted commas in notes", () => {
    const row = [...validRow];
    row[14] = '"manuel, anonim gözlem"';
    expect(parseManualCatalogCandidatesCsv(csv(row)).accepted[0].notes).toBe("manuel, anonim gözlem");
  });

  it("rejects missing attestation and inverted year ranges", () => {
    const row = [...validRow];
    row[6] = "2022"; row[7] = "2020"; row[15] = "";
    expect(parseManualCatalogCandidatesCsv(csv(row)).rejected[0].issues)
      .toEqual(["USAGE_ATTESTATION_REQUIRED", "YEAR_RANGE_INVALID"]);
  });

  it("requires the versioned template headers", () => {
    expect(() => parseManualCatalogCandidatesCsv("Brand,Model\nA,B\n")).toThrow("MANUAL_INDEX_HEADERS_INVALID");
  });

  it("normalizes Turkish characters deterministically", () => {
    expect(normalizeCatalogToken("  Škoda İÇİN  ")).toBe("skoda icin");
  });
});
