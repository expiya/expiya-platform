import type { AnalystMode } from "./shadowRuntime.server";

export interface AnalystActivationEvidence {
  readonly ownerReviewedCases: number;
  readonly shadowCases: number;
  readonly neutralShadowCases: number;
  readonly structuredSchemaPassed: boolean;
  readonly sourceSpanGovernancePassed: boolean;
  readonly dependencyAndReductionTestsPassed: boolean;
  readonly publicPayloadLeakageTestsPassed: boolean;
  readonly promptfooConfigurationValidated: boolean;
  readonly liveModelEvaluationPassed: boolean;
}

export interface AnalystActivationDecision {
  readonly maximumSafeMode: AnalystMode;
  readonly allowed: boolean;
  readonly blockers: readonly string[];
}

const MIN_OWNER_REVIEWED_CASES_FOR_QUESTION_INPUT = 50;

export function evaluateAnalystActivation(
  requestedMode: AnalystMode,
  evidence: AnalystActivationEvidence,
): AnalystActivationDecision {
  if (requestedMode === "OFF") return { maximumSafeMode: "OFF", allowed: true, blockers: [] };

  const shadowBlockers = [
    ...(!evidence.structuredSchemaPassed ? ["STRUCTURED_SCHEMA_NOT_VERIFIED"] : []),
    ...(!evidence.sourceSpanGovernancePassed ? ["SOURCE_SPAN_GOVERNANCE_NOT_VERIFIED"] : []),
    ...(!evidence.dependencyAndReductionTestsPassed ? ["QUESTION_GATES_NOT_VERIFIED"] : []),
    ...(!evidence.publicPayloadLeakageTestsPassed ? ["PUBLIC_PAYLOAD_LEAKAGE_NOT_VERIFIED"] : []),
    ...(evidence.shadowCases < 1 || evidence.neutralShadowCases !== evidence.shadowCases ? ["SHADOW_NEUTRALITY_NOT_PROVEN"] : []),
  ];
  if (shadowBlockers.length > 0) return { maximumSafeMode: "OFF", allowed: false, blockers: shadowBlockers };
  if (requestedMode === "SHADOW") return { maximumSafeMode: "SHADOW", allowed: true, blockers: [] };

  const questionInputBlockers = [
    ...(evidence.ownerReviewedCases < MIN_OWNER_REVIEWED_CASES_FOR_QUESTION_INPUT ? ["OWNER_REVIEWED_CORPUS_BELOW_MINIMUM"] : []),
    ...(!evidence.promptfooConfigurationValidated ? ["PROMPTFOO_CONFIGURATION_NOT_VALIDATED"] : []),
    ...(!evidence.liveModelEvaluationPassed ? ["LIVE_MODEL_EVALUATION_NOT_PASSED"] : []),
  ];
  if (questionInputBlockers.length > 0) return { maximumSafeMode: "SHADOW", allowed: false, blockers: questionInputBlockers };

  if (requestedMode === "QUESTION_INPUT") return { maximumSafeMode: "QUESTION_INPUT", allowed: true, blockers: [] };
  return {
    maximumSafeMode: "QUESTION_INPUT",
    allowed: false,
    blockers: ["EXPLICIT_FACT_PROJECTION_REQUIRES_SEPARATE_ACCEPTANCE_GATE"],
  };
}
