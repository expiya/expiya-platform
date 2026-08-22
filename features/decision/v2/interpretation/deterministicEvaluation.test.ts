import { describe, expect, it } from "vitest";

import { DETERMINISTIC_INTERPRETATION_EVALUATION_CORPUS } from "./deterministicEvaluationCorpus";
import { evaluateDeterministicInterpretation } from "./deterministicEvaluation";
import { enforceInterpretationSemanticCompleteness } from "./semanticCompleteness";
import type { InterpretationResult } from "./types";

const empty = (messageId: string): InterpretationResult => ({ schemaVersion: 1, messageId, acts: [], directAnswerRequests: [], constraintMutations: [], budgetMutations: [], modelReferences: [], personaMutations: [], corrections: [], ambiguities: [] });

describe("deterministic interpretation measurable gate", () => {
  it("meets the versioned controlled-corpus thresholds", () => {
    const report = evaluateDeterministicInterpretation(DETERMINISTIC_INTERPRETATION_EVALUATION_CORPUS, (item) => enforceInterpretationSemanticCompleteness({
      result: empty(item.id), userText: item.userText, activeFieldIds: [],
      ...(item.openMaterialQuestionField ? { openMaterialQuestionField: item.openMaterialQuestionField } : {}),
    }));
    expect(report.failures).toEqual([]);
    expect(report).toMatchObject({ casePassRate: 1, requiredSignalRecall: 1, forbiddenSignalViolationRate: 0, metamorphicConsistencyRate: 1, repeatabilityRate: 1 });
    expect(Object.keys(report.categoryMetrics)).toHaveLength(10);
    expect(Object.values(report.categoryMetrics).every((metric) => metric.casePassRate === 1 && metric.requiredSignalRecall === 1 && metric.forbiddenSignalViolationRate === 0)).toBe(true);
  });
});
