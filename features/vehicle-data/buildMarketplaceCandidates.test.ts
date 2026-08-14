import { describe, expect, it } from "vitest";

import { marketplaceCandidatePilotBatches } from "@/data/research/marketplaceCandidatePilot";
import { buildMarketplaceCandidates } from "@/features/vehicle-data/buildMarketplaceCandidates";

describe("buildMarketplaceCandidates", () => {
  it("deduplicates identical observations while retaining an exposure count", () => {
    const candidates = buildMarketplaceCandidates([
      { brand: "SWM", model: "G01F", year: 2026 },
      { brand: "SWM", model: "G01F", year: 2026 },
    ], "https://example.com/vehicles", "2026-08-14");
    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({ occurrenceCount: 2, normalizedBrand: "swm", normalizedModel: "g01f" });
  });

  it("keeps different year, powertrain and trim combinations separate", () => {
    const candidates = buildMarketplaceCandidates([
      { brand: "Toyota", model: "Corolla", year: 2022, engine: "1.8 Hybrid 122 HP" },
      { brand: "Toyota", model: "Corolla", year: 2025, engine: "1.8 Hybrid 140 HP" },
    ], "https://example.com/vehicles", "2026-08-14");
    expect(candidates).toHaveLength(2);
    expect(new Set(candidates.map(({ fingerprint }) => fingerprint)).size).toBe(2);
  });

  it("builds 25 unique research candidates from the first two live source pages", () => {
    expect(marketplaceCandidatePilotBatches.map(({ candidates }) => candidates.length)).toEqual([13, 12]);
    expect(marketplaceCandidatePilotBatches.flatMap(({ candidates }) => candidates)
      .some(({ brandRaw, modelRaw }) => brandRaw === "BYD" && modelRaw === "Seal")).toBe(true);
  });
});
