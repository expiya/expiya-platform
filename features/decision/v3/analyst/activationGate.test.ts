import { describe, expect, it } from "vitest";
import { evaluateAnalystActivation, type AnalystActivationEvidence } from "./activationGate";

const evidence = (override: Partial<AnalystActivationEvidence> = {}): AnalystActivationEvidence => ({
  ownerReviewedCases: 50,
  shadowCases: 50,
  neutralShadowCases: 50,
  structuredSchemaPassed: true,
  sourceSpanGovernancePassed: true,
  dependencyAndReductionTestsPassed: true,
  publicPayloadLeakageTestsPassed: true,
  promptfooConfigurationValidated: true,
  liveModelEvaluationPassed: true,
  explicitFactProjectionPassed: true,
  correctionProjectionPassed: true,
  ...override,
});

describe("Semantic Needs Analyst activation gate", () => {
  it("always permits the rollback-safe OFF mode", () => {
    expect(evaluateAnalystActivation("OFF", evidence({ structuredSchemaPassed: false }))).toEqual({ maximumSafeMode: "OFF", allowed: true, blockers: [] });
  });

  it("fails closed to OFF when shadow neutrality is incomplete", () => {
    expect(evaluateAnalystActivation("SHADOW", evidence({ neutralShadowCases: 49 }))).toMatchObject({ maximumSafeMode: "OFF", allowed: false, blockers: ["SHADOW_NEUTRALITY_NOT_PROVEN"] });
  });

  it("allows SHADOW after the non-authority gates pass", () => {
    expect(evaluateAnalystActivation("SHADOW", evidence())).toEqual({ maximumSafeMode: "SHADOW", allowed: true, blockers: [] });
  });

  it("keeps QUESTION_INPUT blocked without sufficient reviewed examples and live-model evaluation", () => {
    expect(evaluateAnalystActivation("QUESTION_INPUT", evidence({ ownerReviewedCases: 20, liveModelEvaluationPassed: false }))).toMatchObject({
      maximumSafeMode: "SHADOW",
      allowed: false,
      blockers: ["OWNER_REVIEWED_CORPUS_BELOW_MINIMUM", "LIVE_MODEL_EVALUATION_NOT_PASSED"],
    });
  });

  it("enables explicit-fact projection only after its separate acceptance evidence passes", () => {
    expect(evaluateAnalystActivation("EXPLICIT_FACTS_AND_QUESTIONS", evidence())).toEqual({
      maximumSafeMode: "EXPLICIT_FACTS_AND_QUESTIONS",
      allowed: true,
      blockers: [],
    });
    expect(evaluateAnalystActivation("EXPLICIT_FACTS_AND_QUESTIONS", evidence({ explicitFactProjectionPassed: false }))).toEqual({
      maximumSafeMode: "QUESTION_INPUT",
      allowed: false,
      blockers: ["EXPLICIT_FACT_PROJECTION_NOT_VERIFIED"],
    });
  });
});
