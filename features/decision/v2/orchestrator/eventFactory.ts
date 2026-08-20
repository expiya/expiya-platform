import { createHash } from "node:crypto";
import type { CatalogSnapshot } from "../catalog/types";
import { normalizeCatalogIdentity } from "../catalog/normalization";
import type { ConstraintEvent } from "../domain/constraint";
import type { ConversationEvent } from "../domain/conversationEvent";
import type { ConversationMemory } from "../domain/conversationMemory";
import type { AuthoritativeSemanticPlan } from "../interpretation/types";
import type { ProposedModelReference } from "../interpretation/types";
import { resolveProposedModelReferences } from "../interpretation/modelLookup";
import type { DecisionTurnV2Input } from "./types";
const stableId = (message: string, sequence: number, type: string) => `v2e_${createHash("sha256").update(`${message}:${sequence}:${type}`).digest("hex").slice(0, 24)}`;
const containsIdentity = (text: string, identity: string) => ` ${text} `.includes(` ${identity} `);
function inferCatalogPreferenceReference(input: { readonly text: string; readonly catalog: CatalogSnapshot; readonly existing: readonly ProposedModelReference[] }): ProposedModelReference | undefined {
  if (!/(?:istiyorum|almak|başlangıç|öner|hazırla|tercih)/iu.test(input.text)) return undefined;
  if (!input.catalog.familyIndex || !input.catalog.brandIndex) return undefined;
  const existingResults = resolveProposedModelReferences(input.catalog, input.existing);
  const hasResolvedScope = input.existing.some((reference, index) => ["PREFERENCE", "HARD_SCOPE", "COMPARISON_SCOPE"].includes(reference.purpose) && existingResults[index]?.kind !== "NOT_FOUND");
  if (hasResolvedScope) return undefined;
  let normalizedText: string;
  try { normalizedText = normalizeCatalogIdentity(input.text); } catch { return undefined; }
  const familyMatches = input.catalog.familyIndex.values()
    .filter((family) => containsIdentity(normalizedText, `${family.normalizedBrand} ${family.normalizedModel}`) || containsIdentity(normalizedText, family.normalizedModel))
    .sort((left, right) => right.normalizedModel.length - left.normalizedModel.length || left.familyId.localeCompare(right.familyId));
  const longest = familyMatches[0];
  if (longest && familyMatches.filter((family) => family.normalizedModel.length === longest.normalizedModel.length).length === 1) {
    return { rawText: `${longest.canonicalBrand} ${longest.canonicalModel}`, parsedBrandText: longest.canonicalBrand, parsedModelText: longest.canonicalModel, purpose: "PREFERENCE" };
  }
  const brand = input.catalog.brandIndex.values()
    .filter((entry) => containsIdentity(normalizedText, entry.normalizedBrand))
    .sort((left, right) => right.normalizedBrand.length - left.normalizedBrand.length || left.normalizedBrand.localeCompare(right.normalizedBrand))[0];
  return brand ? { rawText: brand.canonicalBrand, parsedBrandText: brand.canonicalBrand, purpose: "PREFERENCE" } : undefined;
}
export function createConversationEventsFromInterpretation(input: { readonly turn: DecisionTurnV2Input; readonly interpretation: AuthoritativeSemanticPlan; readonly previous?: ConversationMemory; readonly catalog: CatalogSnapshot }): readonly ConversationEvent[] {
  if (input.interpretation.authorityBoundary !== "AUTHORITATIVE_SEMANTIC_PLAN") throw new TypeError("AUTHORITATIVE_SEMANTIC_PLAN_REQUIRED");
  const events: ConversationEvent[] = []; const sourceTurn = (input.previous?.turn ?? 0) + 1; const base = { schemaVersion: 1 as const, conversationId: input.turn.conversationId, sourceMessageId: input.turn.messageId, sourceTurn, createdAt: input.turn.requestTime };
  const push = (event: { readonly eventType: ConversationEvent["eventType"]; readonly [key: string]: unknown }) => { const sequence = events.length; events.push({ ...base, ...event, id: stableId(input.turn.messageId, sequence, event.eventType), sequence } as ConversationEvent); };
  if (input.interpretation.result.acts.includes("VEHICLE_INTENT")) push({ eventType: "VEHICLE_INTENT_ESTABLISHED" });
  const openQuestion = [...(input.previous?.materialQuestionHistory ?? [])].reverse().find((item) => item.answerStatus === "OPEN");
  if (openQuestion) {
    const matchingConstraintMutation = input.interpretation.acceptedConstraintMutations.find((mutation) => mutation.fieldId === openQuestion.field || (openQuestion.stableSemanticKey === "semanticRecovery.economicMeaning" && ["relativePriceSegment", "runningCostPreference"].includes(mutation.fieldId)));
    const matchingBudgetMutation = openQuestion.field === "budget" && input.interpretation.acceptedBudgetMutations.length > 0;
    const genericDecline = /^\s*(?:fark etmez|önemli değil|geç)\s*[.!]?\s*$/iu.test(input.turn.userMessage);
    const declined = genericDecline || matchingConstraintMutation?.operation === "DECLINE";
    const deferred = input.interpretation.result.acts.includes("DONT_KNOW") || /(?:bunu|kullanım(?: ayrıntısını)?|gövde(?:yi| tipini)?|yakıtı)\s+sonra\s+konuşalım/iu.test(input.turn.userMessage);
    const answered = Boolean(matchingConstraintMutation || matchingBudgetMutation);
    if (declined || deferred || answered) push({ eventType: "MATERIAL_QUESTION_DISPOSITION", questionId: openQuestion.questionId, stableSemanticKey: openQuestion.stableSemanticKey, status: declined ? "DECLINED" : deferred ? "DEFERRED" : "ANSWERED" });
  }
  const priorConstraints = input.previous?.events.filter((event): event is ConstraintEvent => event.eventType === "CONSTRAINT") ?? [];
  for (const mutation of input.interpretation.acceptedConstraintMutations) { const prior = [...priorConstraints].reverse().find((event) => event.field === (mutation.supersedesFieldId ?? mutation.fieldId)); const hard = mutation.deterministicDecisionUse === "HARD_CANDIDATE"; push({ eventType: "CONSTRAINT", kind: mutation.operation === "DECLINE" ? "DECLINED" : hard ? "HARD_CONSTRAINT" : mutation.deterministicDecisionUse === "GUIDED_ONLY" ? "GUIDED_APPROXIMATION" : mutation.deterministicDecisionUse === "ILLUSTRATIVE_ONLY" ? "ILLUSTRATIVE_SIGNAL" : "SOFT_PREFERENCE", field: mutation.fieldId, normalizedValue: mutation.normalizedValue, sourceText: mutation.sourceSpan, confidence: mutation.confidence, authority: "USER_EXPLICIT", decisionEffect: mutation.operation === "CLEAR" || mutation.operation === "DECLINE" ? "NONE" : hard ? "HARD_FILTER" : mutation.deterministicDecisionUse === "STRONG_OR_SOFT_RANK" ? "STRONG_RANK" : "EXPLANATION_ONLY", status: mutation.operation === "DECLINE" ? "DECLINED" : "ACTIVE", ...(mutation.operation === "CORRECT" && prior ? { supersedesId: prior.id } : {}) }); }
  for (const mutation of input.interpretation.acceptedBudgetMutations) { const prior = [...(input.previous?.events ?? [])].reverse().find((event) => event.eventType === "BUDGET_MUTATION" && "field" in event && event.field === mutation.field); if (mutation.operation === "EXCLUDE_FROM_DECISION") push({ eventType: "BUDGET_MUTATION", operation: "EXCLUDE_FROM_DECISION" }); else if (mutation.operation === "CLEAR") push({ eventType: "BUDGET_MUTATION", operation: "CLEAR", field: mutation.field, ...(prior ? { supersedesEventId: prior.id } : {}) }); else push({ eventType: "BUDGET_MUTATION", operation: mutation.operation, field: mutation.field, value: mutation.value, ...(mutation.operation === "CORRECT" && prior ? { supersedesEventId: prior.id } : {}) } as never); }
  for (const mutation of input.interpretation.acceptedPersonaMutations) { const prior = [...(input.previous?.events ?? [])].reverse().find((event) => event.eventType === "PERSONA_ACTIVATED"); if (mutation.operation === "ACTIVATE" && mutation.traits.length) push({ eventType: "PERSONA_ACTIVATED", activationSource: "USER_EXPLICIT", requestedTraits: mutation.traits as [typeof mutation.traits[number], ...typeof mutation.traits[number][]] }); else if (mutation.operation === "DEACTIVATE") push({ eventType: "PERSONA_DEACTIVATED", reason: "USER_CLEARED", ...(prior ? { supersedesEventId: prior.id } : {}) }); }
  const inferredPreference = inferCatalogPreferenceReference({ text: input.turn.userMessage, catalog: input.catalog, existing: input.interpretation.result.modelReferences });
  const providerLookupResults = resolveProposedModelReferences(input.catalog, input.interpretation.result.modelReferences);
  const retainedProviderReferences = inferredPreference
    ? input.interpretation.result.modelReferences.filter((reference, index) => reference.purpose === "COMPARISON_SCOPE" || providerLookupResults[index]?.kind !== "NOT_FOUND")
    : input.interpretation.result.modelReferences;
  const modelReferences = inferredPreference ? [...retainedProviderReferences, inferredPreference] : retainedProviderReferences;
  const lookupResults = resolveProposedModelReferences(input.catalog, modelReferences);
  modelReferences.forEach((reference, index) => {
    const lookup = lookupResults[index]!;
    const resolution = lookup.kind === "BRAND" ? "BRAND_ONLY" : lookup.kind;
    const resolvedFamilyIds = lookup.kind === "EXACT_VARIANT" || lookup.kind === "EXACT_MODEL_FAMILY" ? [lookup.familyId] : lookup.kind === "BRAND" || lookup.kind === "AMBIGUOUS" ? lookup.familyIds : [];
    const resolvedVariantIds = lookup.kind === "EXACT_VARIANT" ? [lookup.variantId] : lookup.kind === "EXACT_MODEL_FAMILY" || lookup.kind === "AMBIGUOUS" ? lookup.variantIds : [];
    push({ eventType: "MODEL_REFERENCE", referenceId: stableId(input.turn.messageId, events.length, "reference"), rawText: reference.rawText, ...(reference.parsedBrandText ? { normalizedBrand: reference.parsedBrandText } : {}), ...(reference.parsedModelText ? { normalizedModel: reference.parsedModelText } : {}), resolution, decisionEffect: reference.purpose, resolvedFamilyIds, resolvedVariantIds });
  });
  const rejection = input.interpretation.result.candidateRejection;
  if (rejection) {
    const revealedSetRejection = rejection.scope === "AMBIGUOUS" && rejection.referenceText === "REVEALED_SET" && (input.previous?.revealedCandidateIds.length ?? 0) > 0;
    const lookup = revealedSetRejection ? undefined : resolveProposedModelReferences(input.catalog, [{ rawText: rejection.referenceText, parsedModelText: rejection.referenceText, purpose: "PREFERENCE" }])[0];
    if (revealedSetRejection) for (const candidateId of input.previous!.revealedCandidateIds) push({ eventType: "CANDIDATE_REJECTION", scope: "EXACT_VARIANT", candidateId, reason: "OTHER_EXPLICIT", scopeExplicitlyRequested: true });
    else if (rejection.scope === "MODEL_FAMILY_EXPLICIT" && lookup && (lookup.kind === "EXACT_MODEL_FAMILY" || lookup.kind === "EXACT_VARIANT")) push({ eventType: "CANDIDATE_REJECTION", scope: "MODEL_FAMILY", familyId: lookup.familyId, reason: "MODEL_DISLIKE", scopeExplicitlyRequested: true });
    else if (rejection.scope === "BRAND_EXPLICIT" && lookup?.kind === "BRAND" && lookup.familyIds[0]) push({ eventType: "CANDIDATE_REJECTION", scope: "BRAND", brandId: normalizeCatalogIdentity(lookup.canonicalBrand), reason: "BRAND_DISLIKE", scopeExplicitlyRequested: true });
    else if (rejection.scope === "EXACT_REVEALED" && lookup?.kind === "EXACT_VARIANT") push({ eventType: "CANDIDATE_REJECTION", scope: "EXACT_VARIANT", candidateId: lookup.variantId, reason: "OTHER_EXPLICIT", scopeExplicitlyRequested: true });
  }
  if (input.interpretation.result.socialSignal) { const kind = input.interpretation.result.socialSignal.kind; push({ eventType: "SOCIAL_INTERACTION", interaction: "SHORT_SOCIAL", ...(!["GREETING", "GENERAL"].includes(kind) ? { humanContext: kind } : {}) }); }
  if (input.interpretation.result.offTopicSignal) push({ eventType: "OFF_TOPIC", transition: "DETECTED" });
  else if ((input.previous?.offTopicState.consecutiveOffTopicTurns ?? 0) > 0 && (input.interpretation.acceptedConstraintMutations.length > 0 || input.interpretation.acceptedBudgetMutations.length > 0 || input.interpretation.result.modelReferences.length > 0 || input.interpretation.result.acts.some((act) => ["VEHICLE_INTENT", "USAGE_STATEMENT", "PREFERENCE_STATEMENT", "HARD_REQUIREMENT", "CORRECTION", "RECOMMENDATION_REQUEST", "QUESTION_ANSWER"].includes(act)))) push({ eventType: "OFF_TOPIC", transition: "RETURNED_TO_VEHICLE" });
  if (input.interpretation.result.abuseSignal) push({ eventType: "ABUSE", transition: input.previous?.abuseState.level === "NONE" || !input.previous ? "BOUNDARY_SET" : input.previous.abuseState.level === "BOUNDARY_SET" ? "WARNED" : "ENDED" });
  // Every committed turn must carry a stable ledger identity. This event is
  // conversation-only and deliberately does not invalidate an open offer.
  if (events.length === 0) push({ eventType: "VEHICLE_INTENT_ESTABLISHED" });
  return Object.freeze(events);
}
