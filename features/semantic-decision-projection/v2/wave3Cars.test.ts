import { describe, expect, it } from "vitest";
import { classifyQuestionAdmission } from "./domainPackAdmission";
import { validateSemanticDecisionProjection } from "./invariants";
import { executePMaterialityShadow } from "./materialityExecutor";
import { buildWave3CarsProjection } from "./wave3Cars.server";

describe("Wave-3 Cars V3.9-preserving P projection", () => {
  it("covers all 549 exact variants, preserves unknowns and adds no membership/winner authority", async () => {
    const projection = await buildWave3CarsProjection(process.cwd());
    expect(projection.offerings).toHaveLength(549);
    expect(validateSemanticDecisionProjection(projection)).toEqual([]);
    expect(classifyQuestionAdmission(projection)).toBe("ASKABLE");
    const result = executePMaterialityShadow({ candidatePool: projection.offerings.map((offering) => offering.exactOfferingId), currentContext: { market: "TR", configurationIds: projection.applicability.configurationIds, evaluatedAt: "2026-09-08T12:00:00.000+03:00", satisfiedPrerequisiteIds: projection.materialQuestion.prerequisites.map((item) => item.prerequisiteId), relevantNeedIds: [projection.userNeed.needId], questionsAskedThisSession: 0, userFatigue: 0 }, projections: [projection] });
    expect(result).toMatchObject({ outcome: "ASK_ONE_QUESTION", candidatePoolUnchanged: true, productionMutation: false });
    expect(result.trace.evaluations[0]).toMatchObject({ knownCandidateCount: 507, unknownCandidateCount: 42 });
    expect(result.trace.evaluations[0]!.knownPartitions).toHaveProperty("DIRECTION_MATCH");
    expect(result.trace.evaluations[0]!.knownPartitions).toHaveProperty("DIRECTION_OTHER");
  });
});
