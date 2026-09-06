import { createHash } from "node:crypto";
import { z } from "zod";
import { RECOMMENDATION_CONSTRUCTION_POLICY_ID, washingMachineRecommendationConstructionPolicyDraftSchema } from "./recommendationConstructionPolicyDraft";

const sha = z.string().regex(/^[a-f0-9]{64}$/u);
const text = z.string().min(1);
export const RECOMMENDATION_CONSTRUCTION_CANONICALIZATION = "CANONICAL_JSON_SORTED_KEYS_V1" as const;
export const washingMachineRecommendationConstructionPolicyPayloadSchema = washingMachineRecommendationConstructionPolicyDraftSchema.omit({ governanceStatus: true, lifecycle: true, runtimeActive: true, createdAt: true, creationWorkUnit: true }).extend({
  governanceStatus: z.enum(["APPROVED", "READY_FOR_APPROVAL"]), lifecycle: z.enum(["FROZEN", "DRAFT"]), runtimeActive: z.boolean(), approvedAt: z.string().datetime({ offset: true }),
  bindings: z.strictObject({ catalog: z.strictObject({ release: text, releaseDigest: sha, membershipDigest: sha, artifactSha256: sha }), semanticRegistry: z.strictObject({ id: text, digest: sha }), questionPolicy: z.strictObject({ id: text, digest: sha }), sufficiencyPolicy: z.strictObject({ id: text, digest: sha }), candidateSelectionPolicy: z.strictObject({ id: text, digest: sha }), selectionRuntimeInputContract: text }),
  provenance: z.strictObject({ draftWorkUnit: z.literal("WU-APPL-RECOMMENDATION-CONSTRUCTION-POLICY-01"), approvalWorkUnit: z.literal("WU-APPL-RECOMMENDATION-CONSTRUCTION-POLICY-APPROVAL-FREEZE-01"), approvedBy: z.literal("ORGANIZATOR"), reviewVerdict: z.literal("APPROVED_WITHOUT_SEMANTIC_AMENDMENT"), draftSource: z.string().min(1) }),
});
export const washingMachineRecommendationConstructionPolicyArtifactSchema = z.strictObject({ envelopeSchemaVersion: z.literal("washing-machine-recommendation-construction-policy-artifact/v1"), canonicalSerialization: z.literal(RECOMMENDATION_CONSTRUCTION_CANONICALIZATION), policyDigest: sha, payload: washingMachineRecommendationConstructionPolicyPayloadSchema });
export const washingMachineRecommendationConstructionPolicyActivePointerSchema = z.strictObject({ schemaVersion: z.literal("appliances-recommendation-construction-policy-active-pointer/v1"), policyId: z.literal(RECOMMENDATION_CONSTRUCTION_POLICY_ID), policyDigest: sha, policyFile: z.string().regex(/^releases\/WASHING_MACHINE_RECOMMENDATION_CONSTRUCTION_POLICY-v\d+\.\d+\/policy\.json$/u), lifecycle: z.literal("ACTIVE") });
export type WashingMachineRecommendationConstructionPolicyArtifact = z.infer<typeof washingMachineRecommendationConstructionPolicyArtifactSchema>;
type Json = Record<string, unknown>;
const canonical = (value: unknown): unknown => Array.isArray(value) ? value.map(canonical) : value && typeof value === "object" ? Object.fromEntries(Object.entries(value as Json).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, canonical(item)])) : value;
export const digestRecommendationConstructionPolicy = (payload: unknown): string => createHash("sha256").update(JSON.stringify(canonical(payload))).digest("hex");

export type RecommendationConstructionPolicyFailure = "POLICY_SCHEMA_INVALID" | "POLICY_DIGEST_MISMATCH" | "POLICY_NOT_APPROVED" | "POLICY_NOT_FROZEN" | "POLICY_NOT_ACTIVE" | "CATALOG_BINDING_MISMATCH" | "SEMANTIC_BINDING_MISMATCH" | "QUESTION_POLICY_BINDING_MISMATCH" | "SUFFICIENCY_POLICY_BINDING_MISMATCH" | "SELECTION_POLICY_BINDING_MISMATCH" | "SELECTION_RUNTIME_BINDING_MISMATCH" | "INCOMPLETE_OUTCOME_HANDLING" | "INCOMPLETE_ARTIFACT_CONTRACT" | "INVALID_RATIONALE_SOURCE" | "RATIONALE_AUTHORITY_VIOLATION" | "INTERPRETATION_AUTHORITY_VIOLATION" | "INCOMPLETE_DISCLOSURE_POLICY" | "PRICE_AUTHORITY_VIOLATION" | "INVALID_REALIZATION_MODEL" | "INCOMPLETE_FALLBACK" | "FORBIDDEN_CLAIM_POLICY_MISSING" | "AUTHORIZATION_BOUNDARY_VIOLATION" | "INCOMPATIBLE_AUTHORITY";
export type RecommendationConstructionPolicyValidation = { status: "VALID"; artifact: WashingMachineRecommendationConstructionPolicyArtifact } | { status: "INVALID"; reason: RecommendationConstructionPolicyFailure };
export function validateRecommendationConstructionPolicy(input: { artifact: unknown; expectedDigest: string; expected: { catalog: Json; semantic: Json; question: Json; sufficiency: Json; selection: Json; selectionRuntime: string } }): RecommendationConstructionPolicyValidation {
  const parsed = washingMachineRecommendationConstructionPolicyArtifactSchema.safeParse(input.artifact); if (!parsed.success) return { status: "INVALID", reason: "POLICY_SCHEMA_INVALID" };
  const a = parsed.data, p = a.payload;
  if (digestRecommendationConstructionPolicy(p) !== a.policyDigest || a.policyDigest !== input.expectedDigest) return { status: "INVALID", reason: "POLICY_DIGEST_MISMATCH" };
  if (p.governanceStatus !== "APPROVED") return { status: "INVALID", reason: "POLICY_NOT_APPROVED" }; if (p.lifecycle !== "FROZEN") return { status: "INVALID", reason: "POLICY_NOT_FROZEN" }; if (!p.runtimeActive) return { status: "INVALID", reason: "POLICY_NOT_ACTIVE" };
  if (JSON.stringify(p.bindings.catalog) !== JSON.stringify(input.expected.catalog)) return { status: "INVALID", reason: "CATALOG_BINDING_MISMATCH" };
  if (JSON.stringify(p.bindings.semanticRegistry) !== JSON.stringify(input.expected.semantic)) return { status: "INVALID", reason: "SEMANTIC_BINDING_MISMATCH" };
  if (JSON.stringify(p.bindings.questionPolicy) !== JSON.stringify(input.expected.question)) return { status: "INVALID", reason: "QUESTION_POLICY_BINDING_MISMATCH" };
  if (JSON.stringify(p.bindings.sufficiencyPolicy) !== JSON.stringify(input.expected.sufficiency)) return { status: "INVALID", reason: "SUFFICIENCY_POLICY_BINDING_MISMATCH" };
  if (JSON.stringify(p.bindings.candidateSelectionPolicy) !== JSON.stringify(input.expected.selection)) return { status: "INVALID", reason: "SELECTION_POLICY_BINDING_MISMATCH" };
  if (p.bindings.selectionRuntimeInputContract !== input.expected.selectionRuntime) return { status: "INVALID", reason: "SELECTION_RUNTIME_BINDING_MISMATCH" };
  const outcomes = p.outcomePolicy.map((item) => item.selectionOutcome); if (new Set(outcomes).size !== 5 || p.outcomePolicy.some((item) => item.singleProductAllowed !== (item.selectionOutcome === "SELECTED_SINGLE"))) return { status: "INVALID", reason: "INCOMPLETE_OUTCOME_HANDLING" };
  if (p.artifactContract.requiredFields.length < 30 || p.artifactContract.prohibitedFields.length !== 5 || p.artifactContract.authoritativeForm !== "STRUCTURED_ARTIFACT") return { status: "INVALID", reason: "INCOMPLETE_ARTIFACT_CONTRACT" };
  if (p.rationaleContract.allowedSources.some((source) => /marketing|retailer|seller|affiliate|LLM world|Cars|Advisor/u.test(source))) return { status: "INVALID", reason: "INVALID_RATIONALE_SOURCE" };
  if (p.rationaleContract.rationaleEligibilityEffect !== "NONE" || p.rationaleContract.mismatchEffect !== "FAILED_CLOSED") return { status: "INVALID", reason: "RATIONALE_AUTHORITY_VIOLATION" };
  if (!p.rationaleContract.technicalInterpretationSeparation.semanticAuthorityRequired || !p.rationaleContract.technicalInterpretationSeparation.supportingEvidenceRequired || p.rationaleContract.technicalInterpretationSeparation.newTechnicalFactEffect !== "FORBIDDEN") return { status: "INVALID", reason: "INTERPRETATION_AUTHORITY_VIOLATION" };
  if (p.disclosurePolicy.categories.length !== 15 || p.disclosurePolicy.ordering.length !== 12 || p.disclosurePolicy.materialOmissionEffect !== "FAILED_CLOSED") return { status: "INVALID", reason: "INCOMPLETE_DISCLOSURE_POLICY" };
  if (p.pricePolicy.authority !== "VOLATILE_COMMERCE_PROJECTION" || p.pricePolicy.permanentTruth || p.pricePolicy.technicalFact || p.pricePolicy.affiliateEffect !== "NONE") return { status: "INVALID", reason: "PRICE_AUTHORITY_VIOLATION" };
  if (p.realizationPolicy.model !== "STRUCTURED_FACTS_PLUS_BOUNDED_MODEL_REALIZATION" || p.realizationPolicy.authoritativeLayer !== "STRUCTURED_ARTIFACT") return { status: "INVALID", reason: "INVALID_REALIZATION_MODEL" };
  if (p.realizationPolicy.fallback !== "DETERMINISTIC_TEMPLATES_OR_NO_PROSE" || p.realizationPolicy.violationEffect !== "NO_PLAUSIBLE_RECOMMENDATION_PROSE") return { status: "INVALID", reason: "INCOMPLETE_FALLBACK" };
  if (p.languagePolicy.forbiddenClaimClasses.length !== 8 || p.languagePolicy.forbiddenClaimClasses.some((claim) => !claim.startsWith("FORBID:"))) return { status: "INVALID", reason: "FORBIDDEN_CLAIM_POLICY_MISSING" };
  if (p.decisionAuthorizationBoundary.authorizesDecisionReady || p.decisionAuthorizationBoundary.authorizesDecisionAuthorization || p.decisionAuthorizationBoundary.authorizesDecisionCard || p.artifactContract.prohibitedFields.length !== 5) return { status: "INVALID", reason: "AUTHORIZATION_BOUNDARY_VIOLATION" };
  if (p.persona.contentEffect !== "NONE" || p.commerce.sellerEffect !== "NONE" || p.commerce.affiliateEffect !== "NONE" || p.scope.recommendationRuntime !== "OUT_OF_SCOPE") return { status: "INVALID", reason: "INCOMPATIBLE_AUTHORITY" };
  return { status: "VALID", artifact: a };
}
