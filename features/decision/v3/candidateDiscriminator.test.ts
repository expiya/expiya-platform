import { describe, expect, it } from "vitest";
import { planV3PersonaDiscriminator, planV3TechnicalDiscriminator } from "./candidateDiscriminator";
import type { CatalogVariantSnapshot } from "../v2/catalog/types";

const variant = (id: string, lengthMm: number, luggageLitres: number, rangeKm?: number): CatalogVariantSnapshot => ({
  id,
  brand: "Test",
  model: id,
  trim: "Test",
  decisionFacts: {
    dimensions: { lengthMm: { value: lengthMm }, luggageLitres: { value: luggageLitres } },
    powertrain: { powerKw: { value: lengthMm / 10 }, fuelType: { value: "BEV" }, transmission: { value: "AUTOMATIC" } },
    efficiency: { ...(rangeKm ? { electricRangeKm: { value: rangeKm } } : {}) },
    bodyStyle: { value: "SUV" },
    safetyFeatureCodes: [],
  },
} as unknown as CatalogVariantSnapshot);

describe("candidate discriminator realization", () => {
  const variants = [variant("a", 4_100, 400, 420), variant("b", 4_700, 600, 560)];

  it("does not repeat the same technical lead across rounds", () => {
    const first = planV3TechnicalDiscriminator(variants, [], []);
    const second = planV3TechnicalDiscriminator(variants, [first!.key], []);
    expect(first?.text).toMatch(/^Şimdi seçenekleri/iu);
    expect(second?.text).toMatch(/^Teknik tarafta/iu);
    expect(second?.text).not.toContain("Tek ve gerekçelendirilebilir");
  });

  it("does not use the old repetitive preamble for persona questions", () => {
    const plan = planV3PersonaDiscriminator(variants, [], []);
    if (plan) expect(plan.text).not.toContain("Tek ve gerekçelendirilebilir");
  });
});
