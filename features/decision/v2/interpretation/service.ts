import type { DecisionFieldRegistry } from "../filter/types";
import { createStructuredInterpretationRequest } from "./prompt";
import { validateInterpretationPolicy } from "./policy";
import { parseInterpretationResult } from "./schema";
import type { AuthoritativeSemanticPlan, StructuredInterpretationModel } from "./types";
import { assessInterpretationSemanticCompleteness, enforceInterpretationSemanticCompleteness } from "./semanticCompleteness";
import { createAuthoritativeSemanticPlan } from "./authorityPlan";
import type { InterpretationResult } from "./types";

function suspendDecisionEffectsWhileAmbiguous(result: InterpretationResult): InterpretationResult {
  if (result.ambiguities.length === 0) return result;
  return Object.freeze({
    ...result,
    constraintMutations: Object.freeze([]),
    budgetMutations: Object.freeze([]),
    modelReferences: Object.freeze([]),
    personaMutations: Object.freeze([]),
    corrections: Object.freeze([]),
    candidateRejection: undefined,
  });
}

export function interpretDeterministicMaterialQuestionAnswer(input: { readonly messageId: string; readonly userText: string; readonly fieldRegistry: DecisionFieldRegistry; readonly activeFieldIds?: readonly string[]; readonly openMaterialQuestionField: string; readonly revealedCandidateReferences?: readonly string[] }): AuthoritativeSemanticPlan {
  const raw: InterpretationResult = { schemaVersion: 1, messageId: input.messageId, acts: ["QUESTION_ANSWER"], directAnswerRequests: [], constraintMutations: [], budgetMutations: [], modelReferences: [], personaMutations: [], corrections: [], ambiguities: [] };
  const activeFieldIds = input.activeFieldIds ?? [];
  const result = enforceInterpretationSemanticCompleteness({ result: raw, userText: input.userText, activeFieldIds, openMaterialQuestionField: input.openMaterialQuestionField, revealedCandidateReferences: input.revealedCandidateReferences ?? [] });
  const validated = validateInterpretationPolicy({ result, userText: input.userText, fieldRegistry: input.fieldRegistry, activeFieldIds, openMaterialQuestionField: input.openMaterialQuestionField, dailyLifeMappingIds: [], revealedCandidateReferences: input.revealedCandidateReferences ?? [] });
  return createAuthoritativeSemanticPlan({ raw, validated });
}
export function interpretDeterministicCatalogOverview(input: { readonly messageId: string; readonly userText: string; readonly fieldRegistry: DecisionFieldRegistry; readonly activeFieldIds?: readonly string[] }): AuthoritativeSemanticPlan {
  const raw: InterpretationResult = { schemaVersion: 1, messageId: input.messageId, acts: ["TECHNICAL_EXPLANATION_REQUEST"], directAnswerRequests: [{ kind: "TECHNICAL_EXPLANATION" }], constraintMutations: [], budgetMutations: [], modelReferences: [], personaMutations: [], technicalGuidanceRequest: { fieldId: "bodyStyle", mode: "GUIDE_WITH_DAILY_LIFE" }, corrections: [], ambiguities: [] };
  const activeFieldIds = input.activeFieldIds ?? [];
  const result = enforceInterpretationSemanticCompleteness({ result: raw, userText: input.userText, activeFieldIds, revealedCandidateReferences: [] });
  const validated = validateInterpretationPolicy({ result, userText: input.userText, fieldRegistry: input.fieldRegistry, activeFieldIds, dailyLifeMappingIds: [], revealedCandidateReferences: [] });
  return createAuthoritativeSemanticPlan({ raw, validated });
}
export async function interpretUserMessage(input: { readonly model: StructuredInterpretationModel; readonly messageId: string; readonly userText: string; readonly fieldRegistry: DecisionFieldRegistry; readonly activeFieldIds?: readonly string[]; readonly openMaterialQuestionField?: string; readonly dailyLifeMappingIds?: readonly string[]; readonly revealedCandidateReferences?: readonly string[] }): Promise<AuthoritativeSemanticPlan> { const raw = await input.model.interpret(createStructuredInterpretationRequest(input.messageId, input.userText)); const parsed = parseInterpretationResult(raw); if (parsed.messageId !== input.messageId) throw new TypeError("Interpretation messageId mismatch."); const activeFieldIds = input.activeFieldIds ?? []; const completed = enforceInterpretationSemanticCompleteness({ result: parsed, userText: input.userText, activeFieldIds, openMaterialQuestionField: input.openMaterialQuestionField, revealedCandidateReferences: input.revealedCandidateReferences ?? [] }); const result = suspendDecisionEffectsWhileAmbiguous(completed); const validated = validateInterpretationPolicy({ result, userText: input.userText, fieldRegistry: input.fieldRegistry, activeFieldIds, openMaterialQuestionField: input.openMaterialQuestionField, dailyLifeMappingIds: input.dailyLifeMappingIds ?? [], revealedCandidateReferences: input.revealedCandidateReferences ?? [] }); const plan = createAuthoritativeSemanticPlan({ raw: parsed, validated }); const completeness = assessInterpretationSemanticCompleteness({ interpretation: plan, userText: input.userText, activeFieldIds }); if (!completeness.complete && result.ambiguities.length === 0) throw new TypeError(`SEMANTIC_COMPLETENESS_FAILED:${completeness.codes.join(",")}`); return plan; }
