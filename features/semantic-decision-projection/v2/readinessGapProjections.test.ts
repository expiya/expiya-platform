import { describe, expect, it } from "vitest";
import { buildActiveCatalogInventory } from "./activeCatalogInventory.server";
import { classifyQuestionAdmission } from "./domainPackAdmission";
import { validateSemanticDecisionProjection } from "./invariants";
import { executePMaterialityShadow } from "./materialityExecutor";
import { buildReadinessGapProjections, READINESS_GAP_CATEGORY_IDS } from "./readinessGapProjections.server";

describe("information-only readiness gap projections", () => {
  it("covers every remaining exact offering while suppressing P and preserving UNKNOWN", async () => {
    const projections = buildReadinessGapProjections(await buildActiveCatalogInventory(process.cwd()));
    expect(projections.map((item) => item.identity.categoryId)).toEqual(READINESS_GAP_CATEGORY_IDS);
    expect(projections.reduce((sum, item) => sum + item.offerings.length, 0)).toBe(59);
    for (const projection of projections) {
      expect(validateSemanticDecisionProjection(projection)).toEqual([]);
      expect(classifyQuestionAdmission(projection)).toBe("SUPPRESSED");
      const result = executePMaterialityShadow({ candidatePool: projection.offerings.map((offering) => offering.exactOfferingId), currentContext: { market: "TR", configurationIds: projection.applicability.configurationIds, evaluatedAt: "2026-09-08T12:00:00.000+03:00", satisfiedPrerequisiteIds: [], relevantNeedIds: [], questionsAskedThisSession: 0, userFatigue: 0 }, projections: [projection] });
      expect(result).toMatchObject({ outcome: "NO_MATERIAL_QUESTION", sufficiency: "NOT_EVALUATED", candidatePoolUnchanged: true, productionMutation: false });
      expect(Object.values(projection.materialQuestion.candidateEffectByAnswer).flat().every((effect) => effect.effect === "unknownRetain" && effect.uncertainty === "UNKNOWN")).toBe(true);
    }
  });
});
