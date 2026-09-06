import { DETERMINISTIC_INTERPRETATION_EVALUATION_CORPUS } from "@/features/decision/v2/interpretation/deterministicEvaluationCorpus";
import { evaluateDeterministicInterpretation } from "@/features/decision/v2/interpretation/deterministicEvaluation";
import { enforceInterpretationSemanticCompleteness } from "@/features/decision/v2/interpretation/semanticCompleteness";
import type { InterpretationResult } from "@/features/decision/v2/interpretation/types";

const empty = (messageId: string): InterpretationResult => ({ schemaVersion: 1, messageId, acts: [], directAnswerRequests: [], constraintMutations: [], budgetMutations: [], modelReferences: [], personaMutations: [], corrections: [], ambiguities: [] });
const report = evaluateDeterministicInterpretation(DETERMINISTIC_INTERPRETATION_EVALUATION_CORPUS, (item) => enforceInterpretationSemanticCompleteness({
  result: empty(item.id), userText: item.userText, activeFieldIds: [],
  ...(item.openMaterialQuestionField ? { openMaterialQuestionField: item.openMaterialQuestionField } : {}),
}));
console.log(JSON.stringify(report, null, 2));
if (report.casePassRate < 1 || report.requiredSignalRecall < 1 || report.forbiddenSignalViolationRate > 0 || report.metamorphicConsistencyRate < 1 || report.repeatabilityRate < 1) process.exitCode = 1;
