import { describe, expect, it } from "vitest";
import { materiality, validateSmartphoneObservations } from "./smartphoneCatalogExpansion";
import terminal from "../../data/research/electronics/smartphone-amazon-tr-catalog-expansion-01/terminal-ledger.json";
import packageData from "../../data/research/electronics/smartphone-amazon-tr-catalog-expansion-01/owner-approval-package.json";

describe("smartphone Amazon TR catalog expansion candidate", () => {
  it("has reproducible unique observations and no silent drops", () => {
    expect(validateSmartphoneObservations(terminal.observations as never[])).toEqual([]);
    expect(terminal.observations).toHaveLength(7);
    expect(terminal.observations.every(row => row.terminalState && row.reason)).toBe(true);
  });
  it("keeps Amazon, price, affiliate, brand and catalog order outside authority", () => {
    expect(packageData.invariants).toMatchObject({ amazonTechnicalAuthority: "NONE", priceRankingEffect: "NONE", affiliateRankingEffect: "NONE", brandPrompting: "PROHIBITED", catalogOrderRankingEffect: "NONE", activePointerMutation: false });
  });
  it("admits a materially broader exact set and treats missing as unknown", () => {
    expect(packageData.counts.admittedExactProducts).toBe(6);
    expect(packageData.counts.newExactProducts).toBe(3);
    expect(packageData.unknownLedger.every(row => row.value === "UNKNOWN")).toBe(true);
  });
  it("only calls a fact material when a known majority splits", () => {
    expect(materiality(["A", "B", null])).toMatchObject({ material: true });
    expect(materiality(["A", null, null])).toMatchObject({ material: false });
    expect(materiality(["A", "A", "A"])).toMatchObject({ material: false });
  });
});
