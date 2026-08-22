import type { DecisionFieldRegistry } from "../filter/types";
import { createStructuredInterpretationRequest } from "./prompt";
import { validateInterpretationPolicy } from "./policy";
import { parseInterpretationResult } from "./schema";
import type { AuthoritativeSemanticPlan, StructuredInterpretationModel } from "./types";
import { assessInterpretationSemanticCompleteness, enforceInterpretationSemanticCompleteness, isControlledBodyStyleVehicleRequest, isControlledCatalogAttributeAvailabilityRequest, isControlledOpenEndedVehicleRequest, isControlledSocialMessage, isControlledTechnicalInformationRequest, isControlledUsageRecommendationRequest, isControlledVehicleSelectionStatement } from "./semanticCompleteness";
import { createAuthoritativeSemanticPlan } from "./authorityPlan";
import type { InterpretationResult } from "./types";
import { isControlledHumanContextVehicleRequest } from "./humanContextPolicy";

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
export function isDeterministicShortMaterialQuestionAnswer(userText: string): boolean {
  return /^(?:fark etmez|önemli değil|tercihim yok|fikrim yok|bilmiyorum|emin değilim)[.!]?$/iu.test(userText.trim());
}
export function isDeterministicMaterialQuestionAnswer(userText: string, field: string): boolean {
  const value = userText.trim();
  if (isDeterministicShortMaterialQuestionAnswer(value)) return true;
  if (field === "seats") return /\b(?:en az\s+)?(?:\d+|dört|beş|altı|yedi|sekiz|dokuz)(?:\s*[-–]\s*\d+)?\s*(?:kişilik|koltuk)\b/iu.test(value);
  if (field === "budget") return /^(?:\d+(?:[.,]\d+)?\s*(?:milyon|bin)?(?:\s*(?:tl|₺))?)$/iu.test(value);
  if (field === "fuelType") return /^(?:elektrik(?:li)?|benzin(?:li)?|dizel|lpg|hafif hibrit|mild hibrit|tam hibrit|hibrit|hibrid|şarj edilebilir hibrit|plug[ -]?in hibrit)$/iu.test(value);
  if (field === "usageScenario") return /^(?:günlük(?: şehir içi)?|şehir içi|aile(?: ve yolcu kullanımı)?|uzun yol|şehir içi dağıtım|yük taşıma|kırsalda kullanım|köy|yolcu taşıma|çamur veya kar|ciddi arazi)$/iu.test(value);
  if (field === "bodyStyle") return /^(?:suv(?:\/crossover)?|crossover|fastback suv|hatchback|sedan|coupe|liftback|station wagon|pickup|pick[ -]?up|pikap|kapalı kasa ticari|panel van|şasi kabin|yolcu vanı|passenger van|mpv)$/iu.test(value);
  if (field === "drivenWheels") return /^(?:önden çekiş|arkadan itiş|dört çeker|4x4|awd|fwd|rwd)$/iu.test(value);
  if (field === "transmission") return /^(?:otomatik|manuel)$/iu.test(value);
  return false;
}
export function isDeterministicCrossFieldQuestionAnswer(userText: string): boolean {
  return /\b(?:en az\s+)?(?:\d+|dört|beş|altı|yedi|sekiz|dokuz)(?:\s*[-–]\s*\d+)?\s*(?:kişilik|koltuk)\b/iu.test(userText);
}
export function interpretDeterministicCatalogOverview(input: { readonly messageId: string; readonly userText: string; readonly fieldRegistry: DecisionFieldRegistry; readonly activeFieldIds?: readonly string[] }): AuthoritativeSemanticPlan {
  const raw: InterpretationResult = { schemaVersion: 1, messageId: input.messageId, acts: ["TECHNICAL_EXPLANATION_REQUEST"], directAnswerRequests: [{ kind: "TECHNICAL_EXPLANATION" }], constraintMutations: [], budgetMutations: [], modelReferences: [], personaMutations: [], technicalGuidanceRequest: { fieldId: "bodyStyle", mode: "GUIDE_WITH_DAILY_LIFE" }, corrections: [], ambiguities: [] };
  const activeFieldIds = input.activeFieldIds ?? [];
  const result = enforceInterpretationSemanticCompleteness({ result: raw, userText: input.userText, activeFieldIds, revealedCandidateReferences: [] });
  const validated = validateInterpretationPolicy({ result, userText: input.userText, fieldRegistry: input.fieldRegistry, activeFieldIds, dailyLifeMappingIds: [], revealedCandidateReferences: [] });
  return createAuthoritativeSemanticPlan({ raw, validated });
}
export function interpretDeterministicCatalogSuperlative(input: { readonly messageId: string; readonly userText: string; readonly fieldRegistry: DecisionFieldRegistry; readonly activeFieldIds?: readonly string[] }): AuthoritativeSemanticPlan {
  const raw: InterpretationResult = { schemaVersion: 1, messageId: input.messageId, acts: ["VEHICLE_INTENT", "TECHNICAL_EXPLANATION_REQUEST"], directAnswerRequests: [{ kind: "OTHER_SUPPORTED" }], constraintMutations: [], budgetMutations: [], modelReferences: [], personaMutations: [], corrections: [], ambiguities: [] };
  const activeFieldIds = input.activeFieldIds ?? [];
  const result = enforceInterpretationSemanticCompleteness({ result: raw, userText: input.userText, activeFieldIds, revealedCandidateReferences: [] });
  const validated = validateInterpretationPolicy({ result, userText: input.userText, fieldRegistry: input.fieldRegistry, activeFieldIds, dailyLifeMappingIds: [], revealedCandidateReferences: [] });
  return createAuthoritativeSemanticPlan({ raw, validated });
}
export function interpretDeterministicCatalogComparison(input: { readonly messageId: string; readonly userText: string; readonly fieldRegistry: DecisionFieldRegistry; readonly brandNames: readonly string[]; readonly activeFieldIds?: readonly string[] }): AuthoritativeSemanticPlan {
  const raw: InterpretationResult = { schemaVersion: 1, messageId: input.messageId, acts: ["VEHICLE_INTENT", "MODEL_COMPARISON_REQUEST"], directAnswerRequests: [{ kind: "MODEL_COMPARISON" }], constraintMutations: [], budgetMutations: [], modelReferences: input.brandNames.map((brand) => ({ rawText: brand, parsedBrandText: brand, purpose: "COMPARISON_SCOPE" as const })), personaMutations: [], corrections: [], ambiguities: [] };
  const activeFieldIds = input.activeFieldIds ?? [];
  const result = enforceInterpretationSemanticCompleteness({ result: raw, userText: input.userText, activeFieldIds, revealedCandidateReferences: [] });
  const validated = validateInterpretationPolicy({ result, userText: input.userText, fieldRegistry: input.fieldRegistry, activeFieldIds, dailyLifeMappingIds: [], revealedCandidateReferences: [] });
  return createAuthoritativeSemanticPlan({ raw, validated });
}
export function interpretDeterministicModelSuitability(input: { readonly messageId: string; readonly userText: string; readonly fieldRegistry: DecisionFieldRegistry; readonly brand: string; readonly model: string; readonly activeFieldIds?: readonly string[] }): AuthoritativeSemanticPlan {
  const raw: InterpretationResult = { schemaVersion: 1, messageId: input.messageId, acts: ["VEHICLE_INTENT", "MODEL_SUITABILITY_REQUEST"], directAnswerRequests: [{ kind: "MODEL_SUITABILITY" }], constraintMutations: [], budgetMutations: [], modelReferences: [{ rawText: `${input.brand} ${input.model}`, parsedBrandText: input.brand, parsedModelText: input.model, purpose: "LOOKUP_ONLY" }], personaMutations: [], corrections: [], ambiguities: [] };
  const activeFieldIds = input.activeFieldIds ?? [];
  const result = enforceInterpretationSemanticCompleteness({ result: raw, userText: input.userText, activeFieldIds, revealedCandidateReferences: [] });
  const validated = validateInterpretationPolicy({ result, userText: input.userText, fieldRegistry: input.fieldRegistry, activeFieldIds, dailyLifeMappingIds: [], revealedCandidateReferences: [] });
  return createAuthoritativeSemanticPlan({ raw, validated });
}
export function interpretDeterministicModelLookup(input: { readonly messageId: string; readonly userText: string; readonly fieldRegistry: DecisionFieldRegistry; readonly brand: string; readonly model: string; readonly activeFieldIds?: readonly string[] }): AuthoritativeSemanticPlan {
  const raw: InterpretationResult = { schemaVersion: 1, messageId: input.messageId, acts: ["MODEL_LOOKUP_REQUEST"], directAnswerRequests: [{ kind: "MODEL_AVAILABILITY" }], constraintMutations: [], budgetMutations: [], modelReferences: [{ rawText: `${input.brand} ${input.model}`, parsedBrandText: input.brand, parsedModelText: input.model, purpose: "LOOKUP_ONLY" }], personaMutations: [], corrections: [], ambiguities: [] };
  const activeFieldIds = input.activeFieldIds ?? [];
  const validated = validateInterpretationPolicy({ result: raw, userText: input.userText, fieldRegistry: input.fieldRegistry, activeFieldIds, dailyLifeMappingIds: [], revealedCandidateReferences: [] });
  return createAuthoritativeSemanticPlan({ raw, validated });
}
export function interpretDeterministicControlledVehicleRequest(input: { readonly messageId: string; readonly userText: string; readonly fieldRegistry: DecisionFieldRegistry; readonly activeFieldIds?: readonly string[] }): AuthoritativeSemanticPlan | undefined {
  const controlledBodyRequest = isControlledBodyStyleVehicleRequest(input.userText);
  const controlledHumanContextRequest = isControlledHumanContextVehicleRequest(input.userText);
  const controlledAvailabilityRequest = isControlledCatalogAttributeAvailabilityRequest(input.userText);
  const controlledUsageRequest = isControlledUsageRecommendationRequest(input.userText);
  const controlledSocialMessage = isControlledSocialMessage(input.userText);
  const controlledTechnicalRequest = isControlledTechnicalInformationRequest(input.userText);
  const controlledSelectionStatement = isControlledVehicleSelectionStatement(input.userText);
  const controlledOpenEndedRequest = isControlledOpenEndedVehicleRequest(input.userText);
  if (!controlledBodyRequest && !controlledHumanContextRequest && !controlledAvailabilityRequest && !controlledUsageRequest && !controlledSocialMessage && !controlledTechnicalRequest && !controlledSelectionStatement && !controlledOpenEndedRequest) return undefined;
  const raw: InterpretationResult = { schemaVersion: 1, messageId: input.messageId, acts: controlledOpenEndedRequest ? ["VEHICLE_INTENT", "RECOMMENDATION_REQUEST"] : [], directAnswerRequests: controlledOpenEndedRequest ? [{ kind: "RECOMMENDATION_REQUEST" }] : [], constraintMutations: [], budgetMutations: [], modelReferences: [], personaMutations: [], corrections: [], ambiguities: [] };
  const activeFieldIds = input.activeFieldIds ?? [];
  const result = enforceInterpretationSemanticCompleteness({ result: raw, userText: input.userText, activeFieldIds, revealedCandidateReferences: [] });
  const validated = validateInterpretationPolicy({ result, userText: input.userText, fieldRegistry: input.fieldRegistry, activeFieldIds, dailyLifeMappingIds: [], revealedCandidateReferences: [] });
  const plan = createAuthoritativeSemanticPlan({ raw, validated });
  const completeness = assessInterpretationSemanticCompleteness({ interpretation: plan, userText: input.userText, activeFieldIds });
  const bodyAccepted = plan.acceptedConstraintMutations.some((mutation) => mutation.fieldId === "bodyStyle");
  const usageAccepted = plan.acceptedConstraintMutations.some((mutation) => mutation.fieldId === "usageScenario");
  const vehicleIntentAccepted = plan.result.acts.includes("VEHICLE_INTENT") && plan.result.acts.includes("RECOMMENDATION_REQUEST");
  const socialAccepted = plan.result.acts.includes("GREETING") || plan.result.acts.includes("SOCIAL_MESSAGE");
  const technicalAccepted = plan.result.acts.includes("TECHNICAL_EXPLANATION_REQUEST") && plan.result.directAnswerRequests.some((request) => request.kind === "TECHNICAL_EXPLANATION");
  if (!completeness.complete || controlledBodyRequest && !bodyAccepted || controlledHumanContextRequest && !vehicleIntentAccepted || controlledAvailabilityRequest && !vehicleIntentAccepted || controlledUsageRequest && (!usageAccepted || !vehicleIntentAccepted) || controlledSocialMessage && !socialAccepted || controlledTechnicalRequest && !technicalAccepted || controlledSelectionStatement && !vehicleIntentAccepted || controlledOpenEndedRequest && !vehicleIntentAccepted) return undefined;
  return plan;
}
export async function interpretUserMessage(input: { readonly model: StructuredInterpretationModel; readonly messageId: string; readonly userText: string; readonly fieldRegistry: DecisionFieldRegistry; readonly activeFieldIds?: readonly string[]; readonly openMaterialQuestionField?: string; readonly dailyLifeMappingIds?: readonly string[]; readonly revealedCandidateReferences?: readonly string[] }): Promise<AuthoritativeSemanticPlan> { const raw = await input.model.interpret(createStructuredInterpretationRequest(input.messageId, input.userText)); const parsed = parseInterpretationResult(raw); if (parsed.messageId !== input.messageId) throw new TypeError("Interpretation messageId mismatch."); const activeFieldIds = input.activeFieldIds ?? []; const completed = enforceInterpretationSemanticCompleteness({ result: parsed, userText: input.userText, activeFieldIds, openMaterialQuestionField: input.openMaterialQuestionField, revealedCandidateReferences: input.revealedCandidateReferences ?? [] }); const result = suspendDecisionEffectsWhileAmbiguous(completed); const validated = validateInterpretationPolicy({ result, userText: input.userText, fieldRegistry: input.fieldRegistry, activeFieldIds, openMaterialQuestionField: input.openMaterialQuestionField, dailyLifeMappingIds: input.dailyLifeMappingIds ?? [], revealedCandidateReferences: input.revealedCandidateReferences ?? [] }); const plan = createAuthoritativeSemanticPlan({ raw: parsed, validated }); const completeness = assessInterpretationSemanticCompleteness({ interpretation: plan, userText: input.userText, activeFieldIds }); if (!completeness.complete && result.ambiguities.length === 0) throw new TypeError(`SEMANTIC_COMPLETENESS_FAILED:${completeness.codes.join(",")}`); return plan; }
