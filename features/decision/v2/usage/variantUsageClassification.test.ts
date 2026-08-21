import { describe, expect, it } from "vitest";
import { loadActiveProductionSnapshotForTest } from "../catalog/productionSnapshotFixture.testSupport";
import { classifyVariantUsageScenarios, usageScenarioDecisionEffect } from "./variantUsageClassification";

describe("variant usage scenario classification", () => {
  it("classifies every active variant into at least one controlled scenario", async () => {
    const loaded = await loadActiveProductionSnapshotForTest();
    expect(loaded.status).toBe("READY"); if (loaded.status !== "READY") return;
    expect(loaded.snapshot.variants.every((variant) => classifyVariantUsageScenarios(variant).length >= 1)).toBe(true);
    expect(classifyVariantUsageScenarios(loaded.snapshot.variants[0]!)).not.toContain("MIXED_PASSENGER");
  });

  it("never labels a non-AWD variant for serious off-road", async () => {
    const loaded = await loadActiveProductionSnapshotForTest();
    expect(loaded.status).toBe("READY"); if (loaded.status !== "READY") return;
    const serious = loaded.snapshot.variants.filter((variant) => classifyVariantUsageScenarios(variant).includes("SERIOUS_OFF_ROAD"));
    expect(serious.length).toBeGreaterThan(0);
    expect(serious.every((variant) => /^(?:AWD|4X4|4WD)$/iu.test(variant.decisionFacts.powertrain.drivenWheels?.value ?? ""))).toBe(true);
  });

  it("uses hard membership except for the two medium terrain scenarios", () => {
    expect(usageScenarioDecisionEffect("URBAN_DAILY")).toBe("HARD_MEMBERSHIP");
    expect(usageScenarioDecisionEffect("GENERAL_CARGO")).toBe("HARD_MEMBERSHIP");
    expect(usageScenarioDecisionEffect("SERIOUS_OFF_ROAD")).toBe("HARD_MEMBERSHIP");
    expect(usageScenarioDecisionEffect("ROUGH_ROAD")).toBe("MEDIUM_RANK");
    expect(usageScenarioDecisionEffect("MUD_SNOW")).toBe("MEDIUM_RANK");
  });
});
