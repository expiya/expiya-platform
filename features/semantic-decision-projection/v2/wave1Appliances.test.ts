import { describe, expect, it } from "vitest";
import { classifyQuestionAdmission } from "./domainPackAdmission";
import { validateSemanticDecisionProjection } from "./invariants";
import { executePMaterialityShadow } from "./materialityExecutor";
import { APPLIANCE_P_MATERIALITY_MAPPINGS, buildWave1ApplianceProjections } from "./wave1Appliances.server";

describe("Wave-1 appliance P-materiality projections", () => {
  it("admits all evidence-separating mappings and no zero-effect category", async () => {
    const projections = await buildWave1ApplianceProjections(process.cwd());
    expect(projections).toHaveLength(19);
    expect(projections.map((projection) => projection.identity.categoryId)).toEqual(Object.keys(APPLIANCE_P_MATERIALITY_MAPPINGS).sort());
    for (const projection of projections) {
      expect(validateSemanticDecisionProjection(projection)).toEqual([]);
      expect(classifyQuestionAdmission(projection)).toBe("ASKABLE");
      const result = executePMaterialityShadow({ candidatePool: projection.offerings.map((offering) => offering.exactOfferingId), currentContext: { market: "TR", configurationIds: projection.applicability.configurationIds, evaluatedAt: "2026-09-08T12:00:00.000+03:00", satisfiedPrerequisiteIds: projection.materialQuestion.prerequisites.map((item) => item.prerequisiteId), relevantNeedIds: [projection.userNeed.needId], questionsAskedThisSession: 0, userFatigue: 0 }, projections: [projection] });
      expect(result).toMatchObject({ outcome: "ASK_ONE_QUESTION", candidatePoolUnchanged: true, productionMutation: false });
      expect(result.trace.evaluations[0]!.knownCandidateCount).toBeGreaterThanOrEqual(result.trace.evaluations[0]!.unknownCandidateCount);
    }
  });
});
