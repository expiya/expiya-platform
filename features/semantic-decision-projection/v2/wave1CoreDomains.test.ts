import { describe, expect, it } from "vitest";
import { classifyQuestionAdmission } from "./domainPackAdmission";
import { validateSemanticDecisionProjection } from "./invariants";
import { executePMaterialityShadow } from "./materialityExecutor";
import { buildWave1CoreDomainProjections } from "./wave1CoreDomains";

describe("Wave-1 core Domain Pack P projections", () => {
  it("binds all 5 categories to exact evidence and an askable directional split", () => {
    const projections = buildWave1CoreDomainProjections();
    expect(projections).toHaveLength(5);
    for (const projection of projections) {
      expect(validateSemanticDecisionProjection(projection)).toEqual([]);
      expect(classifyQuestionAdmission(projection)).toBe("ASKABLE");
      expect(projection.userNeed.decisionUse).toBe("SOFT_PREFERENCE");
      expect(projection.personaDecisionPolicy).toMatchObject({ maximumAggregateScore: 0.75, membershipEffect: "NONE", sufficiencyEffect: "NONE", singleWinnerEffect: "NONE" });
      const result = executePMaterialityShadow({ candidatePool: projection.offerings.map((offering) => offering.exactOfferingId), currentContext: { market: "TR", configurationIds: projection.applicability.configurationIds, evaluatedAt: "2026-09-08T12:00:00.000+03:00", satisfiedPrerequisiteIds: projection.materialQuestion.prerequisites.map((item) => item.prerequisiteId), relevantNeedIds: [projection.userNeed.needId], questionsAskedThisSession: 0, userFatigue: 0 }, projections: [projection] });
      expect(result.outcome).toBe("ASK_ONE_QUESTION");
      expect(result.candidatePoolUnchanged).toBe(true);
      expect(result.trace.maxQuestions).toBe(1);
    }
  });

  it("keeps the exact Segway evidence gap neutral without suppressing the scooter question", () => {
    const scooter = buildWave1CoreDomainProjections().find((projection) => projection.identity.categoryId === "ELECTRIC_SCOOTER")!;
    const evaluation = executePMaterialityShadow({ candidatePool: scooter.offerings.map((offering) => offering.exactOfferingId), currentContext: { market: "TR", configurationIds: scooter.applicability.configurationIds, evaluatedAt: "2026-09-08T12:00:00.000+03:00", satisfiedPrerequisiteIds: scooter.materialQuestion.prerequisites.map((item) => item.prerequisiteId), relevantNeedIds: [scooter.userNeed.needId], questionsAskedThisSession: 0, userFatigue: 0 }, projections: [scooter] }).trace.evaluations[0]!;
    expect(evaluation).toMatchObject({ eligible: true, knownCandidateCount: 2, unknownCandidateCount: 1 });
    const unknownEffects = Object.values(scooter.materialQuestion.candidateEffectByAnswer).flat().filter((effect) => effect.exactOfferingId === "SEGWAY_NINEBOT_F2_PRO_E_TR");
    expect(unknownEffects.every((effect) => effect.effect === "unknownRetain" && effect.uncertainty === "UNKNOWN")).toBe(true);
  });
});
