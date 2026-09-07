import { describe, expect, it } from "vitest";
import { generateWave02Exact15ProductionIntegrationPreflight } from "./generate";

describe("Wave-02 exact-15 production integration preflight", () => {
  it("fails closed while no production loader consumes the overlay", async () => {
    const report = await generateWave02Exact15ProductionIntegrationPreflight();
    expect(report.status).toBe("BLOCKED_RUNTIME_CONSUMPTION_GAP");
    expect(report.membership).toMatchObject({ before: 80, additions: 15, afterOverlayOnly: 95, productionRuntimeVisibleAdditions: 0 });
    expect(report.runtimeConsumption.catalogFactoryPointerConsumers).toEqual([]);
    expect(report.releaseDecision).toMatchObject({ runtimeReady: false, unifiedReleaseManifest: null, pushPreviewApprovalSentence: null });
  });

  it("preserves production authorities and identifies exactly one bounded next unit", async () => {
    const first = await generateWave02Exact15ProductionIntegrationPreflight();
    const second = await generateWave02Exact15ProductionIntegrationPreflight();
    expect(first).toEqual(second);
    expect(first.preservation).toMatchObject({ smartphoneExact: 34, electronicsExact: 121, carsExact: 549, mobilityProducts: 10, personaMembershipEffect: "NONE" });
    expect(first.artifactReadiness).toMatchObject({ exactIdentity: true, facts: true, unknownPolicy: true, dailyLifeSemantics: true, pMaterialityQuestions: true, decisionCardProjection: false });
    expect(first.requiredBoundedIntegrationUnit.id).toBe("WU-CATALOG-FACTORY-WAVE-02-15-EXACT-UNIFIED-RUNTIME-CONSUMER-01");
    expect(Object.values(first.mutationBoundary).every(value => value === false)).toBe(true);
  });
});
