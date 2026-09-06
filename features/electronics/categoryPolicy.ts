import { createHash } from "node:crypto";
import { ELECTRONICS_CATEGORY_IDS, type ElectronicsCategoryId } from "./architectureBaseline";

export const ELECTRONICS_CATEGORY_POLICY_VERSION = "ELECTRONICS-CATEGORY-POLICY-TR-v1.0" as const;
export const ELECTRONICS_CATEGORY_POLICY_SCHEMA = "electronics-category-policy/v1" as const;
export const ELECTRONICS_CATEGORY_POLICY_CANONICALIZATION = "CANONICAL_JSON_SORTED_KEYS_V1" as const;

export type ElectronicsRiskBoundary = "PRIVACY_ACCOUNT_CLOUD_SUBSCRIPTION" | "HEALTH_NON_MEDICAL" | "INSTALLATION_ELECTRICAL_BATTERY_FIRE" | "COMPATIBILITY_ECOSYSTEM_REGION" | "SOFTWARE_FIRMWARE_LIFECYCLE";
export interface ElectronicsCategoryPolicy {
  readonly categoryId: ElectronicsCategoryId; readonly publicLabelTr: string; readonly evidenceReleaseDigest: `sha256:${string}`;
  readonly acceptedContextConcepts: readonly string[]; readonly identityDiscriminators: readonly string[]; readonly minimumAcceptedContext: readonly string[]; readonly governedEvidenceFieldRefs: readonly string[];
  readonly questionPlan: readonly { readonly questionKey: string; readonly targetConcept: string; readonly priority: number; readonly textTr: string; readonly choicesTr: readonly [string, string, string]; readonly askOnlyWhenMaterial: true; readonly alreadyAnsweredSuppresses: true; readonly noRepeatUnless: readonly ["CORRECTED", "CLEARED", "AUTHORITY_MATERIALLY_CHANGED"] }[];
  readonly riskBoundaries: readonly ElectronicsRiskBoundary[];
}
export interface ElectronicsCategoryPolicyPayload {
  readonly schemaVersion: typeof ELECTRONICS_CATEGORY_POLICY_SCHEMA; readonly policyVersion: typeof ELECTRONICS_CATEGORY_POLICY_VERSION; readonly departmentId: "ELECTRONICS"; readonly market: "TR"; readonly lifecycle: "FROZEN"; readonly governanceStatus: "APPROVED"; readonly policyAuthorityActive: true; readonly runtimeActive: false;
  readonly evidenceChain: readonly { readonly wave: 1 | 2 | 3 | 4; readonly releaseVersion: string; readonly releaseDigest: `sha256:${string}`; readonly artifactPath: string; readonly manifestDigest: `sha256:${string}` }[];
  readonly sharedSemantics: {
    readonly context: { readonly normalization: "CANONICAL_CONCEPT_VALUE_WITH_SOURCE_EVENT"; readonly correction: "SUPERSEDE_PRIOR_ACCEPTED_VALUE_AND_REEVALUATE"; readonly clear: "REMOVE_ACTIVE_VALUE_AND_ALLOW_MATERIAL_REASK"; readonly unknown: "EXPLICIT_UNKNOWN_NEVER_INFERRED"; readonly notImportant: "ACCEPTED_NON_FILTERING_VALUE" };
    readonly x: { readonly informationalTurn: "RESPOND_WITH_GOVERNED_INFORMATION_WITHOUT_PURCHASE_PROGRESS"; readonly advisoryBoundary: "NO_SELECTION_RECOMMENDATION_OR_CARD"; readonly offTopic: "REDIRECT_TO_CURRENT_ELECTRONICS_CATEGORY_NEVER_CARS" };
    readonly p: { readonly maximumQuestionsPerTurn: 1; readonly style: "ONE_MATERIAL_HUMAN_LANGUAGE_QUESTION_WITH_CHOICES_WHERE_APPROPRIATE"; readonly forbiddenPrompt: "LIST_ALL_MEASUREMENTS_OR_FUNCTIONS"; readonly ordering: "MATERIAL_EVIDENCE_SAFETY_PRIVACY_COMPATIBILITY_THEN_STABLE_KEY"; readonly suppressAcceptedOrPendingOrUnchangedAsked: true; readonly unknownAndNotImportantAccepted: true };
    readonly candidateEvaluation: { readonly hardCompatibility: "EVIDENCED_EXACT_CONSTRAINT_MISMATCH_ONLY"; readonly incompatibility: "NEEDS_AND_EXACT_CONFIGURATION_OR_REGION_CONFLICT"; readonly unknown: "UNKNOWN_NEVER_SILENT_ELIMINATION_OR_ADVANTAGE"; readonly identity: "EXACT_PRODUCT_CONFIGURATION_REGION_REVISION_REQUIRED"; readonly budget: "ONLY_USER_ENABLED_FRESH_EXACT_PRICE_MAY_HARD_FILTER"; readonly missingOrStalePrice: "UNKNOWN_NOT_TECHNICAL_ELIMINATION" };
    readonly sufficiency: { readonly model: "CATEGORY_REQUIRED_ACCEPTED_CONTEXT_SET_NO_NUMERIC_SCORE"; readonly informationOnly: "RESPOND"; readonly purchaseIntent: "PROGRESS_ONLY_WHEN_MINIMUM_CONTEXT_AND_ELIGIBLE_POOL_EXIST" };
    readonly selection: { readonly algorithm: "DETERMINISTIC_PAIRWISE_EVIDENCE_DOMINANCE_STABLE_SERIALIZATION"; readonly tie: "RETURN_TIED_TOP_SET_NO_WINNER"; readonly nonDominated: "RETURN_NON_DOMINATED_SET_NO_WINNER"; readonly arrayOrderEffect: "NONE" };
    readonly recommendation: { readonly rationale: "BIND_ACCEPTED_NEEDS_TO_GOVERNED_FACTS_AND_DAILY_LIFE_INTERPRETATION"; readonly unsupportedSuperlatives: "FORBIDDEN"; readonly singleWinner: "ONLY_UNIQUE_EVIDENCED_DOMINATOR_OR_SINGLE_ELIGIBLE" };
    readonly authorization: { readonly order: readonly ["SUFFICIENT_CONTEXT", "EVALUATED_POOL", "DETERMINISTIC_SELECTION", "EVIDENCE_BOUND_RATIONALE", "AUTHORIZATION", "CARD_PROJECTION"]; readonly cardWithoutAuthorization: "FORBIDDEN" };
    readonly persona: { readonly mode: "DERIVED_PLANNING"; readonly decisionUse: "NONE"; readonly directCandidateEffect: "NONE" };
    readonly commerce: { readonly l10RankingEffect: "NONE"; readonly amazonEffect: "NONE"; readonly affiliateReviewSellerProminenceEffect: "NONE"; readonly soleException: "EXPLICIT_USER_ENABLED_FRESH_EXACT_HARD_BUDGET_FILTER" };
    readonly manuals: { readonly layer: "L9_ADVISOR_KNOWLEDGE"; readonly technicalAuthority: "NONE_UNLESS_SEPARATELY_PROMOTED" };
  };
  readonly categories: readonly ElectronicsCategoryPolicy[];
  readonly isolation: { readonly appliancesPolicyImported: false; readonly carsPolicyImported: false; readonly mechanicsReusedOnly: true; readonly electronicsEvidenceOnly: true };
  readonly boundaries: { readonly departmentRegistryActivated: false; readonly domainPackActivated: false; readonly persistenceChanged: false; readonly publicUiChanged: false; readonly productionRuntimeActivated: false; readonly deployed: false };
}
export interface ElectronicsCategoryPolicyArtifact { readonly envelopeSchemaVersion: "electronics-category-policy-artifact/v1"; readonly canonicalSerialization: typeof ELECTRONICS_CATEGORY_POLICY_CANONICALIZATION; readonly policyDigest: `sha256:${string}`; readonly payload: ElectronicsCategoryPolicyPayload }

export function canonicalizeElectronicsPolicy(value: unknown): unknown { if (Array.isArray(value)) return value.map(canonicalizeElectronicsPolicy); if (value && typeof value === "object") return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, canonicalizeElectronicsPolicy(item)])); return value; }
export function digestElectronicsPolicy(value: unknown): `sha256:${string}` { return `sha256:${createHash("sha256").update(JSON.stringify(canonicalizeElectronicsPolicy(value))).digest("hex")}`; }

export function validateElectronicsCategoryPolicy(artifact: ElectronicsCategoryPolicyArtifact): readonly string[] {
  const issues: string[] = [], payload = artifact.payload;
  if (artifact.envelopeSchemaVersion !== "electronics-category-policy-artifact/v1" || artifact.canonicalSerialization !== ELECTRONICS_CATEGORY_POLICY_CANONICALIZATION || artifact.policyDigest !== digestElectronicsPolicy(payload)) issues.push("POLICY_DIGEST_OR_ENVELOPE_INVALID");
  if (payload.schemaVersion !== ELECTRONICS_CATEGORY_POLICY_SCHEMA || payload.policyVersion !== ELECTRONICS_CATEGORY_POLICY_VERSION || payload.lifecycle !== "FROZEN" || payload.governanceStatus !== "APPROVED" || !payload.policyAuthorityActive || payload.runtimeActive) issues.push("POLICY_LIFECYCLE_INVALID");
  const ids = payload.categories.map(row => row.categoryId); if (ids.length !== 24 || new Set(ids).size !== 24 || ELECTRONICS_CATEGORY_IDS.some(id => !ids.includes(id))) issues.push("CATEGORY_COVERAGE_INVALID");
  const evidenceDigests = new Set(payload.evidenceChain.map(row => row.releaseDigest));
  for (const row of payload.categories) {
    if (!evidenceDigests.has(row.evidenceReleaseDigest)) issues.push(`MISSING_EVIDENCE:${row.categoryId}`);
    if (!row.acceptedContextConcepts.length || !row.identityDiscriminators.length || !row.minimumAcceptedContext.length || !row.governedEvidenceFieldRefs.length || row.minimumAcceptedContext.some(id => !row.acceptedContextConcepts.includes(id))) issues.push(`CONCEPT_BINDING_INVALID:${row.categoryId}`);
    if (!row.questionPlan.length || row.questionPlan.some(question => !row.acceptedContextConcepts.includes(question.targetConcept) || question.choicesTr.length !== 3 || !question.askOnlyWhenMaterial || !question.alreadyAnsweredSuppresses) || new Set(row.questionPlan.map(question => question.questionKey)).size !== row.questionPlan.length) issues.push(`QUESTION_POLICY_INVALID:${row.categoryId}`);
    if (!row.riskBoundaries.includes("COMPATIBILITY_ECOSYSTEM_REGION")) issues.push(`COMPATIBILITY_RISK_MISSING:${row.categoryId}`);
  }
  if (payload.evidenceChain.length !== 4 || new Set(payload.evidenceChain.map(row => row.wave)).size !== 4) issues.push("EVIDENCE_CHAIN_INVALID");
  const serialized = JSON.stringify(payload.sharedSemantics);
  for (const required of ["UNKNOWN_NEVER_SILENT_ELIMINATION_OR_ADVANTAGE", "UNKNOWN_NOT_TECHNICAL_ELIMINATION", "RETURN_TIED_TOP_SET_NO_WINNER", "RETURN_NON_DOMINATED_SET_NO_WINNER", "FORBIDDEN", "DERIVED_PLANNING", "REDIRECT_TO_CURRENT_ELECTRONICS_CATEGORY_NEVER_CARS"]) if (!serialized.includes(required)) issues.push(`SHARED_CONTRACT_MISSING:${required}`);
  if (!payload.isolation.mechanicsReusedOnly || !payload.isolation.electronicsEvidenceOnly || payload.isolation.appliancesPolicyImported || payload.isolation.carsPolicyImported || Object.values(payload.boundaries).some(Boolean)) issues.push("AUTHORITY_OR_ACTIVATION_LEAK");
  return Object.freeze(issues);
}
