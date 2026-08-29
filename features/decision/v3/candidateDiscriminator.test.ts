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

  it("states the actual remaining-candidate range and data coverage", () => {
    const plan = planV3TechnicalDiscriminator(variants, ["technicalDiscriminator:COMPACT|LUGGAGE|POWER|PRICE"], []);
    expect(plan?.key).toContain("RANGE");
    expect(plan?.text).toMatch(/Elektrikli menzil: 420–560 km \(2\/2 varyantta veri\)/u);
    expect(plan?.text).toMatch(/yalnız bu kalan seçeneklerin gösterilen aralığına göredir/iu);
  });

  it("does not compare electric and liquid-fuel consumption as the same unit", () => {
    const electric = variant("electric", 4_100, 400, 420);
    const petrol = {
      ...variant("petrol", 4_200, 420),
      decisionFacts: {
        ...variant("petrol", 4_200, 420).decisionFacts,
        powertrain: { ...variant("petrol", 4_200, 420).decisionFacts.powertrain, fuelType: { ...variant("petrol", 4_200, 420).decisionFacts.powertrain.fuelType, value: "GASOLINE" } },
        efficiency: { combinedLitresPer100Km: { value: 6.2 } },
      },
    } as unknown as CatalogVariantSnapshot;
    const withConsumption = {
      ...electric,
      decisionFacts: { ...electric.decisionFacts, efficiency: { ...electric.decisionFacts.efficiency, combinedKwhPer100Km: { value: 16.8 } } },
    } as CatalogVariantSnapshot;
    const plan = planV3TechnicalDiscriminator([withConsumption, petrol], ["technicalDiscriminator:COMPACT|LUGGAGE|POWER|PRICE|RANGE|WIDTH|HEIGHT|WHEELBASE|TORQUE|PAYLOAD|TOWING"], []);
    expect(plan?.key ?? "").not.toContain("CONSUMPTION");
  });

  it("does not use the old repetitive preamble for persona questions", () => {
    const plan = planV3PersonaDiscriminator(variants, [], []);
    if (plan) expect(plan.text).not.toContain("Tek ve gerekçelendirilebilir");
  });
});
