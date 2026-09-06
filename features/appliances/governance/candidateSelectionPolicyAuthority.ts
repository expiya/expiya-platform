import { createHash } from "node:crypto";
import { z } from "zod";

export const CANDIDATE_SELECTION_POLICY_ID = "WASHING_MACHINE_CANDIDATE_SELECTION_POLICY/v0.1" as const;
export const CANDIDATE_SELECTION_POLICY_CANONICALIZATION = "CANONICAL_JSON_SORTED_KEYS_V1" as const;
export const CANDIDATE_SELECTION_OUTCOMES = ["SELECTED_SINGLE", "TIED_TOP_SET", "NON_DOMINATED_SET", "NO_GOVERNED_SELECTION", "FAILED_CLOSED"] as const;
const sha = z.string().regex(/^[a-f0-9]{64}$/u);
const text = z.string().min(1);
const approvedClassification = z.enum(["APPROVED_PRODUCT_GOVERNANCE", "EXISTING_SEMANTIC_AUTHORITY", "EXISTING_ARCHITECTURE_CONSTRAINT"]);
const rule = z.strictObject({
  ruleId: z.string().regex(/^CSP-\d{3}$/u), conceptId: text, activeValue: text,
  semanticAuthorityRef: text, evidence: z.array(text).min(1), comparison: text,
  unknownBehavior: text, conflictBehavior: text, tieBehavior: text, rationaleRef: text,
  selectionRole: z.enum(["ACTIVE", "DISCLOSURE_ONLY", "STRUCTURAL"]), governanceClassification: approvedClassification,
});
const scenario = z.strictObject({ scenarioId: z.string().regex(/^S-\d{2}$/u), name: text, outcome: text, ruleRefs: z.array(text).min(1) });
const decision = z.strictObject({ decisionId: z.string().regex(/^PDR-\d{3}$/u), topic: text, authorityEvidence: text, approvedDecision: text, alternativesConsidered: z.array(text).min(1), runtimeConsequence: text, riskControlled: text, governanceClassification: approvedClassification, approvalStatus: z.literal("APPROVED") });

export const washingMachineCandidateSelectionPolicyPayloadSchema = z.strictObject({
  schemaVersion: z.literal("washing-machine-candidate-selection-policy/v1"), policyId: z.literal(CANDIDATE_SELECTION_POLICY_ID),
  governanceStatus: z.literal("APPROVED"), lifecycle: z.literal("FROZEN"), runtimeActive: z.literal(true),
  department: z.literal("APPLIANCES"), capability: z.literal("WASHING_MACHINE"), market: z.literal("TR"), stage: z.literal("AŞAMA_1"), approvedAt: z.string().datetime({ offset: true }),
  provenance: z.strictObject({ draftWorkUnit: z.literal("WU-APPL-CANDIDATE-SELECTION-RANKING-POLICY-01"), approvalWorkUnit: z.literal("WU-APPL-CANDIDATE-SELECTION-RANKING-POLICY-APPROVAL-FREEZE-01"), approvedBy: z.literal("ORGANIZATOR"), reviewVerdict: z.literal("APPROVED_WITHOUT_SEMANTIC_AMENDMENT"), draftSource: text }),
  bindings: z.strictObject({
    catalog: z.strictObject({ release: z.string().regex(/^APPLIANCES-WM-TR-v\d+\.\d+$/u), releaseDigest: sha, membershipDigest: sha, artifactSha256: sha }),
    semanticRegistry: z.strictObject({ id: z.literal("WASHING_MACHINE_SEMANTIC_REGISTRY/v0.1"), digest: sha }),
    questionPolicy: z.strictObject({ id: z.literal("WASHING_MACHINE_QUESTION_POLICY/v0.1"), digest: sha }),
    sufficiencyPolicy: z.strictObject({ id: z.literal("WASHING_MACHINE_SUFFICIENCY_RECOMMENDATION_ENTRY_POLICY/v0.1"), digest: sha }),
    candidateEvaluationPolicy: z.literal("appliances-candidate-evaluation/v1"), questionSelectionPolicy: z.literal("appliances-question-selection/v1"),
    selectionInputContract: z.literal("appliances-sufficiency-recommendation-entry-runtime/v1:RECOMMENDATION_POOL_ELIGIBLE"),
  }),
  inputPolicy: z.strictObject({ allowedOutcome: z.literal("RECOMMENDATION_POOL_ELIGIBLE"), acceptedContextStatuses: z.tuple([z.literal("ACCEPTED_EXPLICIT"), z.literal("ACCEPTED_CONFIRMED"), z.literal("ACCEPTED_INTERPRETED")]), rejectOutcomes: z.tuple([z.literal("FAILED_CLOSED"), z.literal("CLARIFICATION_REQUIRED"), z.literal("MORE_INFORMATION_REQUIRED"), z.literal("UNRESOLVED_HARD_UNCERTAINTY"), z.literal("NO_RECOMMENDATION_ELIGIBLE_CANDIDATE")]), unknownOutcomeEffect: z.literal("FAILED_CLOSED"), hardEligibilityReevaluation: z.literal("FORBIDDEN"), exactUniqueCatalogAuthorizedIdsRequired: z.literal(true), poolFingerprintRequired: z.literal(true), canonicalOrderEffect: z.literal("NONE"), verifiedProvenanceRequired: z.literal(true) }),
  model: z.strictObject({ kind: z.literal("RULE_BASED_PARETO_DOMINANCE"), prioritySource: z.literal("ACCEPTED_USER_CONTEXT_ONLY"), preferencePriority: z.literal("EQUAL"), globalWeights: z.literal("NONE"), contextualWeights: z.literal("NONE"), totalOrderGuaranteed: z.literal(false), incomparableDimensions: z.literal("PRESERVE_NON_DOMINATED_SET"), strictDominance: z.literal("A_DOMINATES_B_IFF_DEMONSTRABLY_NO_WORSE_ON_EVERY_ACTIVE_COMPARABLE_DIMENSION_AND_DEMONSTRABLY_BETTER_ON_AT_LEAST_ONE; UNKNOWN_CONFLICTED_OR_NON_COMPARABLE_CANNOT_ESTABLISH_NO_WORSE") }),
  precedence: z.tuple([z.literal("FAILED_CLOSED"), z.literal("INPUT_GATE"), z.literal("SINGLETON"), z.literal("COMPARE_ACTIVE_PREFERENCES"), z.literal("PRESERVE_AMBIGUITY")]),
  outcomes: z.array(z.strictObject({ kind: z.enum(CANDIDATE_SELECTION_OUTCOMES), meaning: text, allowedWhen: text, downstreamPermission: text, downstreamProhibition: text })).length(5),
  evidenceStates: z.strictObject({ UNKNOWN: text, MISSING: text, CONFLICTED: text, NOT_APPLICABLE: text, NON_COMPARABLE: text, llmConflictResolution: z.literal("FORBIDDEN") }),
  pricePolicy: z.strictObject({ postEligibilityRole: text, lowerPricePreference: text, tieBreakEffect: text, unknownPriceTreatment: text, mixedBudgetOwner: text, sellerAvailabilityEffect: text, affiliateEffect: text }),
  ties: z.strictObject({ singleWinnerRequired: z.boolean(), exactEqualityOutcome: text, crossDimensionOrMaterialIndeterminacyOutcome: text, noActivePreferenceOutcome: text, plannerReentry: text, canonicalSortMeaning: text, forbiddenTieBreaks: z.array(text).min(1) }),
  rationaleBoundary: z.strictObject({ effect: text, countEffect: text, lengthEffect: text, richnessEffect: text, participatingEvidenceBindingRequired: z.boolean(), bindingMismatchEffect: text, limitationsAndUncertaintyDisclosed: z.boolean() }),
  persona: z.strictObject({ authority: text, decisionUse: text, directCandidateEffect: text, selectionEffect: text, rankingEffect: text, tieBreakEffect: text }),
  outputContract: z.strictObject({ requiredFields: z.array(text).min(8), authorizesDecisionReady: z.literal(false), authorizesDecisionAuthorization: z.literal(false), authorizesDecisionCard: z.literal(false), authorizesRecommendationProse: z.literal(false), authorizesCommerce: z.literal(false) }),
  failClosedRules: z.array(text).min(20), rules: z.array(rule).min(10), scenarios: z.array(scenario).length(16), productDecisionRegister: z.array(decision).length(14),
  scope: z.strictObject({ selectionOutcomeAuthority: z.literal("POLICY_ONLY"), runtimeSelector: z.literal("OUT_OF_SCOPE"), recommendationConstruction: z.literal("OUT_OF_SCOPE"), decisionAuthorization: z.literal("OUT_OF_SCOPE"), decisionCard: z.literal("OUT_OF_SCOPE"), advisor: z.literal("OUT_OF_SCOPE"), commerceEffect: z.literal("NONE") }),
});
export const washingMachineCandidateSelectionPolicyArtifactSchema = z.strictObject({ envelopeSchemaVersion: z.literal("washing-machine-candidate-selection-policy-artifact/v1"), canonicalSerialization: z.literal(CANDIDATE_SELECTION_POLICY_CANONICALIZATION), policyDigest: sha, payload: washingMachineCandidateSelectionPolicyPayloadSchema });
export const washingMachineCandidateSelectionPolicyActivePointerSchema = z.strictObject({ schemaVersion: z.literal("appliances-candidate-selection-policy-active-pointer/v1"), policyId: z.literal(CANDIDATE_SELECTION_POLICY_ID), policyDigest: sha, policyFile: text, lifecycle: z.literal("ACTIVE") });
export type WashingMachineCandidateSelectionPolicyArtifact = z.infer<typeof washingMachineCandidateSelectionPolicyArtifactSchema>;
export type CandidateSelectionPolicyFailure = "POLICY_SCHEMA_INVALID" | "POLICY_DIGEST_MISMATCH" | "POLICY_NOT_APPROVED" | "POLICY_NOT_FROZEN" | "POLICY_NOT_ACTIVE" | "CATALOG_BINDING_MISMATCH" | "SEMANTIC_BINDING_MISMATCH" | "QUESTION_POLICY_BINDING_MISMATCH" | "SUFFICIENCY_POLICY_BINDING_MISMATCH" | "CANDIDATE_POLICY_BINDING_MISMATCH" | "INPUT_CONTRACT_MISMATCH" | "INVALID_SELECTION_MODEL" | "UNAUTHORIZED_ACTIVE_CONCEPT" | "INVALID_COMPARISON_DIRECTION" | "INCOMPATIBLE_EVIDENCE_REGIME" | "INCOMPLETE_UNKNOWN_POLICY" | "INCOMPLETE_TIE_POLICY" | "UNAUTHORIZED_TIE_BREAK" | "PERSONA_AUTHORITY_VIOLATION" | "PRICE_AUTHORITY_VIOLATION" | "RATIONALE_AUTHORITY_VIOLATION" | "INCOMPATIBLE_AUTHORITY";

export function canonicalizeCandidateSelectionPolicy(value: unknown): unknown { if (Array.isArray(value)) return value.map(canonicalizeCandidateSelectionPolicy); if (value && typeof value === "object") return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, canonicalizeCandidateSelectionPolicy(item)])); return value; }
export function digestCandidateSelectionPolicy(payload: unknown): string { return createHash("sha256").update(JSON.stringify(canonicalizeCandidateSelectionPolicy(payload))).digest("hex"); }

type ValidationInput = { artifact: unknown; expectedDigest: string; catalog: { release: string; releaseDigest: string; membershipDigest: string; artifactSha256: string }; semantic: { id: string; digest: string }; question: { id: string; digest: string }; sufficiency: { id: string; digest: string }; candidatePolicy: string; questionSelectionPolicy: string; inputContract: string; conceptIds: ReadonlySet<string>; factIds: ReadonlySet<string>; capabilityIds: ReadonlySet<string> };
export function validateCandidateSelectionPolicy(input: ValidationInput): { status: "VALID"; artifact: WashingMachineCandidateSelectionPolicyArtifact } | { status: "INVALID"; reason: CandidateSelectionPolicyFailure } {
  const raw = input.artifact as { policyDigest?: unknown; payload?: Record<string, unknown> } | null, rawPayload = raw?.payload;
  if (rawPayload && typeof raw?.policyDigest === "string" && (raw.policyDigest !== input.expectedDigest || digestCandidateSelectionPolicy(rawPayload) !== raw.policyDigest)) return { status: "INVALID", reason: "POLICY_DIGEST_MISMATCH" };
  const parsed = washingMachineCandidateSelectionPolicyArtifactSchema.safeParse(input.artifact);
  if (!parsed.success) { if (rawPayload?.governanceStatus !== undefined && rawPayload.governanceStatus !== "APPROVED") return { status: "INVALID", reason: "POLICY_NOT_APPROVED" }; if (rawPayload?.lifecycle !== undefined && rawPayload.lifecycle !== "FROZEN") return { status: "INVALID", reason: "POLICY_NOT_FROZEN" }; if (rawPayload?.runtimeActive !== undefined && rawPayload.runtimeActive !== true) return { status: "INVALID", reason: "POLICY_NOT_ACTIVE" }; return { status: "INVALID", reason: "POLICY_SCHEMA_INVALID" }; }
  const artifact = parsed.data, p = artifact.payload, b = p.bindings;
  if (artifact.policyDigest !== input.expectedDigest || digestCandidateSelectionPolicy(p) !== artifact.policyDigest) return { status: "INVALID", reason: "POLICY_DIGEST_MISMATCH" };
  if (JSON.stringify(b.catalog) !== JSON.stringify(input.catalog)) return { status: "INVALID", reason: "CATALOG_BINDING_MISMATCH" };
  if (b.semanticRegistry.id !== input.semantic.id || b.semanticRegistry.digest !== input.semantic.digest) return { status: "INVALID", reason: "SEMANTIC_BINDING_MISMATCH" };
  if (b.questionPolicy.id !== input.question.id || b.questionPolicy.digest !== input.question.digest) return { status: "INVALID", reason: "QUESTION_POLICY_BINDING_MISMATCH" };
  if (b.sufficiencyPolicy.id !== input.sufficiency.id || b.sufficiencyPolicy.digest !== input.sufficiency.digest) return { status: "INVALID", reason: "SUFFICIENCY_POLICY_BINDING_MISMATCH" };
  if (b.candidateEvaluationPolicy !== input.candidatePolicy || b.questionSelectionPolicy !== input.questionSelectionPolicy) return { status: "INVALID", reason: "CANDIDATE_POLICY_BINDING_MISMATCH" };
  if (b.selectionInputContract !== input.inputContract || p.inputPolicy.allowedOutcome !== "RECOMMENDATION_POOL_ELIGIBLE") return { status: "INVALID", reason: "INPUT_CONTRACT_MISMATCH" };
  if (p.model.kind !== "RULE_BASED_PARETO_DOMINANCE" || p.model.globalWeights !== "NONE" || p.model.contextualWeights !== "NONE" || p.model.totalOrderGuaranteed || p.model.preferencePriority !== "EQUAL") return { status: "INVALID", reason: "INVALID_SELECTION_MODEL" };
  const active = p.rules.filter((rule) => rule.selectionRole === "ACTIVE").map((rule) => `${rule.conceptId}=${rule.activeValue}`);
  if (active.join("|") !== "REMOTE_CONTROL=WANTED|DETERGENT_CONVENIENCE=WANTED|LOW_NOISE_PRIORITY=IMPORTANT" || p.rules.some((rule) => rule.selectionRole !== "STRUCTURAL" && !input.conceptIds.has(rule.conceptId))) return { status: "INVALID", reason: "UNAUTHORIZED_ACTIVE_CONCEPT" };
  if (p.rules.some((rule) => rule.evidence.some((evidence) => evidence.startsWith("FACT:") && !input.factIds.has(evidence.slice(5)) || evidence.startsWith("CAPABILITY:") && !input.capabilityIds.has(evidence.slice(11))))) return { status: "INVALID", reason: "INCOMPATIBLE_AUTHORITY" };
  const remote = p.rules.find((rule) => rule.ruleId === "CSP-001"), dosing = p.rules.find((rule) => rule.ruleId === "CSP-003"), noise = p.rules.find((rule) => rule.ruleId === "CSP-005");
  if (!remote?.comparison.includes("PRESENT") || !remote.comparison.includes("NOT_AVAILABLE") || !dosing?.comparison.includes("PRESENT") || !dosing.comparison.includes("NOT_AVAILABLE") || !noise?.comparison.includes("Lower")) return { status: "INVALID", reason: "INVALID_COMPARISON_DIRECTION" };
  if (!noise.comparison.includes("dB") || !noise.comparison.includes("SPIN_PHASE") || !noise.comparison.includes("EU_2019_2014") || !noise.comparison.includes("non-conflicted")) return { status: "INVALID", reason: "INCOMPATIBLE_EVIDENCE_REGIME" };
  if (!p.evidenceStates.UNKNOWN.includes("neither false nor worse") || !p.evidenceStates.MISSING.includes("not NOT_AVAILABLE") || p.evidenceStates.llmConflictResolution !== "FORBIDDEN") return { status: "INVALID", reason: "INCOMPLETE_UNKNOWN_POLICY" };
  if (new Set(p.outcomes.map((outcome) => outcome.kind)).size !== CANDIDATE_SELECTION_OUTCOMES.length || CANDIDATE_SELECTION_OUTCOMES.some((kind) => !p.outcomes.some((outcome) => outcome.kind === kind)) || p.ties.singleWinnerRequired || p.ties.exactEqualityOutcome !== "TIED_TOP_SET" || p.ties.crossDimensionOrMaterialIndeterminacyOutcome !== "NON_DOMINATED_SET" || p.ties.noActivePreferenceOutcome !== "NO_GOVERNED_SELECTION" || p.ties.plannerReentry !== "FORBIDDEN_UNLESS_SEPARATE_APPROVED_TIE_RESOLUTION_QUESTION_POLICY" || p.ties.canonicalSortMeaning !== "SERIALIZATION_ONLY") return { status: "INVALID", reason: "INCOMPLETE_TIE_POLICY" };
  const forbidden = ["CATALOG_ORDER", "PRODUCT_ID_ORDER", "BRAND_ALPHABETIZATION", "LOWER_PRICE", "EVIDENCE_COUNT", "RATIONALE_COUNT", "RATIONALE_LENGTH", "SELLER_AVAILABILITY", "AFFILIATE_PAYOUT", "MARKETPLACE_PROMINENCE", "PERSONA", "LLM_PREFERENCE", "RANDOM_SELECTION"];
  if (p.ties.forbiddenTieBreaks.length !== forbidden.length || forbidden.some((item, index) => p.ties.forbiddenTieBreaks[index] !== item)) return { status: "INVALID", reason: "UNAUTHORIZED_TIE_BREAK" };
  if (p.persona.selectionEffect !== "NONE" || p.persona.rankingEffect !== "NONE" || p.persona.tieBreakEffect !== "NONE") return { status: "INVALID", reason: "PERSONA_AUTHORITY_VIOLATION" };
  if (p.pricePolicy.postEligibilityRole !== "DISCLOSURE_ONLY" || p.pricePolicy.tieBreakEffect !== "NONE" || p.pricePolicy.affiliateEffect !== "NONE" || p.pricePolicy.sellerAvailabilityEffect !== "NONE") return { status: "INVALID", reason: "PRICE_AUTHORITY_VIOLATION" };
  if (p.rationaleBoundary.effect !== "EXPLANATION_ONLY" || p.rationaleBoundary.countEffect !== "NONE" || p.rationaleBoundary.lengthEffect !== "NONE" || p.rationaleBoundary.bindingMismatchEffect !== "FAILED_CLOSED") return { status: "INVALID", reason: "RATIONALE_AUTHORITY_VIOLATION" };
  if (p.scope.runtimeSelector !== "OUT_OF_SCOPE" || p.scope.recommendationConstruction !== "OUT_OF_SCOPE" || p.scope.decisionAuthorization !== "OUT_OF_SCOPE" || p.scope.commerceEffect !== "NONE" || p.outputContract.authorizesDecisionReady || p.outputContract.authorizesDecisionAuthorization) return { status: "INVALID", reason: "INCOMPATIBLE_AUTHORITY" };
  return { status: "VALID", artifact };
}
