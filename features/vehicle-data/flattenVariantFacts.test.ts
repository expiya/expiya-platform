import { describe, expect, it } from "vitest";

import { pilotVehicleRecords } from "@/data/production/pilotVehicles";
import { flattenVariantFacts } from "@/features/vehicle-data/flattenVariantFacts";

describe("flattenVariantFacts", () => {
  it("flattens sourced technical values with units and stable import keys", () => {
    const variant = pilotVehicleRecords[3].technicalVariant!;
    const facts = flattenVariantFacts(variant);
    expect(facts.find(({ key }) => key === "powertrain.powerKw")).toMatchObject({ value: 85, unit: "kW" });
    expect(facts.find(({ key }) => key === "dimensions.luggageLitres")).toMatchObject({ value: 286, unit: "L" });
    expect(facts.filter(({ key }) => key.startsWith("safetyFeatureCodes."))).toHaveLength(11);
    expect(flattenVariantFacts(variant)).toEqual(facts);
  });
});
