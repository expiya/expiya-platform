import { describe, expect, it } from "vitest";
import { classifyQuestionAdmission } from "./domainPackAdmission";
import { validateSemanticDecisionProjection } from "./invariants";
import { executePMaterialityShadow } from "./materialityExecutor";
import { buildWave2ElectronicsProjections, ELECTRONICS_P_MATERIALITY_MAPPINGS, loadSmartphoneProductionPProjections } from "./wave2Electronics.server";

describe("Wave-2 Electronics P-materiality projections", () => {
  it("admits 22 exact evidence-separating categories and suppresses no eligible mapping", async () => {
    const projections = await buildWave2ElectronicsProjections(process.cwd());
    expect(projections).toHaveLength(22);
    expect(projections.map((projection) => projection.identity.categoryId)).toEqual(Object.keys(ELECTRONICS_P_MATERIALITY_MAPPINGS).sort((left, right) => left.localeCompare(right)));
    for (const projection of projections) {
      expect(validateSemanticDecisionProjection(projection)).toEqual([]);
      expect(classifyQuestionAdmission(projection)).toBe("ASKABLE");
      const result = executePMaterialityShadow({ candidatePool: projection.offerings.map((offering) => offering.exactOfferingId), currentContext: { market: "TR", configurationIds: projection.applicability.configurationIds, evaluatedAt: "2026-09-08T12:00:00.000+03:00", satisfiedPrerequisiteIds: projection.materialQuestion.prerequisites.map((item) => item.prerequisiteId), relevantNeedIds: [projection.userNeed.needId], questionsAskedThisSession: 0, userFatigue: 0 }, projections: [projection] });
      expect(result).toMatchObject({ outcome: "ASK_ONE_QUESTION", candidatePoolUnchanged: true, productionMutation: false });
    }
  });

  it("preserves the production Smartphone v2 projections as the reference package", async () => {
    const projections = await loadSmartphoneProductionPProjections(process.cwd());
    expect(projections).toHaveLength(3);
    expect(projections.every((projection) => validateSemanticDecisionProjection(projection).length === 0)).toBe(true);
    expect(projections.every((projection) => projection.userNeed.decisionUse === "SOFT_PREFERENCE")).toBe(true);
    expect(new Set(projections.flatMap((projection) => projection.offerings.map((offering) => offering.exactOfferingId))).size).toBe(34);
  });
});
