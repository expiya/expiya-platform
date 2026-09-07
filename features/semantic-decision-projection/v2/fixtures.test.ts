import { describe, expect, it } from "vitest";
import { buildSemanticDecisionProjectionV2Artifacts } from "./artifacts";
import { buildRepresentativeQuestionFixtures, buildSmartphoneProjectionFixtures } from "./fixtures";
import { executePMaterialityShadow } from "./materialityExecutor";

describe("Semantic decision projection contract fixtures", () => {
  it("covers 34 synthetic Smartphone identities and the pinned 16-known/18-unknown support closure", () => {
    const fixtures = buildSmartphoneProjectionFixtures();
    expect(fixtures).toHaveLength(4);
    expect(fixtures.every((fixture) => fixture.offerings.length === 34)).toBe(true);
    const support = fixtures.find((fixture) => fixture.identity.projectionId === "smartphone.support-duration")!;
    const states = support.materialQuestion.candidateEffectByAnswer.YES;
    expect(states.filter((state) => state.uncertainty === "KNOWN")).toHaveLength(16);
    expect(states.filter((state) => state.uncertainty === "UNKNOWN")).toHaveLength(18);
    expect(support.fixtureClassification).toBe("PINNED_EXTERNAL_LINEAGE_CONTRACT_FIXTURE");
  });

  it("provides good and bad public-question fixtures for all eight requested categories", () => {
    const fixtures = buildRepresentativeQuestionFixtures();
    expect(fixtures.map((fixture) => fixture.categoryId)).toEqual(["LAPTOP", "HEADPHONES", "REFRIGERATOR", "ESPRESSO_MACHINE", "STROLLER", "ELECTRIC_SCOOTER", "CORDLESS_DRILL", "CARS"]);
    for (const fixture of fixtures) {
      expect(fixture.classification).toBe("SYNTHETIC_CONTRACT_FIXTURE");
      const context = { market: "TR", configurationIds: fixture.good.applicability.configurationIds, evaluatedAt: "2026-09-07T12:00:00.000Z", satisfiedPrerequisiteIds: fixture.good.materialQuestion.prerequisites.map((item) => item.prerequisiteId), relevantNeedIds: [fixture.good.userNeed.needId], questionsAskedThisSession: 0, userFatigue: 0 };
      const candidatePool = fixture.good.offerings.map((offering) => offering.exactOfferingId);
      const result = executePMaterialityShadow({ candidatePool, currentContext: context, projections: [fixture.good, fixture.bad] });
      expect(result.selectedProjectionId).toBe(fixture.good.identity.projectionId);
      expect(result.trace.evaluations.find((evaluation) => evaluation.projectionId === fixture.bad.identity.projectionId)?.suppressionReasons).toContain("ZERO_CANDIDATE_EFFECT");
      expect(fixture.good.materialQuestion.publicTurkishQuestion).toMatch(/[çğıöşüİ]/iu);
    }
  });

  it("builds deterministic machine-readable audit artifacts with no-effect proof and separate readiness", () => {
    const first = buildSemanticDecisionProjectionV2Artifacts();
    const second = buildSemanticDecisionProjectionV2Artifacts();
    expect(second.serialized).toEqual(first.serialized);
    expect(first.manifest.releaseDigest).toMatch(/^sha256:[a-f0-9]{64}$/u);
    const readiness = first.artifacts["catalog-factory-readiness-v2.json"] as { levels: Record<string, { ready: boolean }> };
    expect(readiness.levels.INFORMATION_READY.ready).toBe(true);
    expect(readiness.levels.P_READY.ready).toBe(false);
    expect(readiness.levels.Y_READY.ready).toBe(false);
    const proof = first.artifacts["shadow-no-effect-proof.json"] as { before: unknown; after: unknown; assertions: Record<string, boolean> };
    expect(proof.before).toEqual(proof.after);
    expect(Object.values(proof.assertions).every(Boolean)).toBe(true);
  });
});
