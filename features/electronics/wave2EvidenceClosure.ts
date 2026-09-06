import { ELECTRONICS_CATEGORY_REGISTRY, type ElectronicsCategoryId } from "./architectureBaseline";

export const ELECTRONICS_WAVE_2_VERSION = "ELECTRONICS-WAVE-2-EVIDENCE-TR-v0.1" as const;
export const ELECTRONICS_WAVE_2_PARENT_DIGEST = "sha256:4f66ab249373ae03580733249472a3ddebc3fe0369707afd7abec14d2e6b5ab2" as const;
export const ELECTRONICS_WAVE_2_CATEGORY_IDS = ELECTRONICS_CATEGORY_REGISTRY.filter(row => row.wave === 2).map(row => row.categoryId) as readonly ElectronicsCategoryId[];
export type Wave2Readiness = "DECISION_EVIDENCE_READY" | "POLICY_REVIEW_REQUIRED" | "INFORMATION_ONLY" | "BLOCKED_EVIDENCE";

export interface Wave2EvidenceRelease {
  readonly schemaVersion: "electronics-wave-2-evidence/v1";
  readonly releaseVersion: typeof ELECTRONICS_WAVE_2_VERSION;
  readonly parent: { readonly releaseDigest: typeof ELECTRONICS_WAVE_2_PARENT_DIGEST; readonly relationship: "IMMUTABLE_CHILD_NO_OVERWRITE" };
  readonly research: { readonly amazonFirstDigest: `sha256:${string}`; readonly amazonRole: "DISCOVERY_ONLY_ZERO_DECISION_EFFECT"; readonly internationalRole: "TECHNICAL_GAP_FILL_ONLY_NOT_TR_APPLICABILITY" };
  readonly products: readonly { readonly exactProductId: string; readonly categoryId: ElectronicsCategoryId; readonly manufacturer: string; readonly modelCode: string; readonly configurationIdentity: string; readonly trApplicabilitySourceIds: readonly string[]; readonly unresolvedIdentityDiscriminators: readonly string[] }[];
  readonly sources: readonly { readonly sourceId: string; readonly uri: string; readonly market: "TR" | "GLOBAL"; readonly authority: "TECHNICAL" | "TR_APPLICABILITY" | "MANUAL" | "WARRANTY_SAFETY_PRIVACY" | "COMMERCE_DISCOVERY" | "INTERNATIONAL_BOUNDED"; readonly exactProductIds: readonly string[]; readonly trApplicabilityAuthority: "EXACT" | "NONE"; readonly decisionAuthority: "NONE" }[];
  readonly comparativeFacts: readonly { readonly factId: string; readonly exactProductId: string; readonly categoryId: ElectronicsCategoryId; readonly key: string; readonly value: string | number | boolean; readonly unit?: string; readonly sourceId: string; readonly locator: string; readonly decisionEligibility: "DRAFT_POLICY_INPUT"; readonly conflictState: "CLEAR" | "UNKNOWN" }[];
  readonly manuals: readonly { readonly manualId: string; readonly exactProductId: string; readonly sourceUri: string; readonly localPath: string; readonly sha256: `sha256:${string}`; readonly locators: readonly string[]; readonly layer: "L9_ADVISOR_KNOWLEDGE" }[];
  readonly categoryReadiness: readonly { readonly categoryId: ElectronicsCategoryId; readonly candidateCount: number; readonly manufacturerCount: number; readonly comparableFieldCount: number; readonly readiness: Wave2Readiness; readonly reasons: readonly string[]; readonly policyStatus: "REVIEW_REQUIRED_NON_ACTIVE" }[];
  readonly decisionProjections: readonly { readonly projectionId: string; readonly exactProductId: string; readonly eligibleFactIds: readonly string[]; readonly status: "DRAFT_NON_ACTIVE"; readonly unknownTreatment: "NEUTRAL_FAIL_CLOSED"; readonly rankingWeights: "NONE" }[];
  readonly unknownsAndConflicts: readonly { readonly exactProductId: string; readonly code: string; readonly effect: "NEUTRAL_FAIL_CLOSED" }[];
  readonly boundaries: { readonly l7Experience: "ABSENT"; readonly mediaImported: false; readonly l10YEffect: "NONE"; readonly amazonStatusEffect: "NONE"; readonly activationPerformed: false; readonly registryChanged: false; readonly runtimeChanged: false; readonly databaseChanged: false; readonly pointerChanged: false; readonly deploymentPerformed: false };
}

export function validateWave2EvidenceClosure(release: Wave2EvidenceRelease): readonly string[] {
  const issues: string[] = [];
  if (release.parent.releaseDigest !== ELECTRONICS_WAVE_2_PARENT_DIGEST || release.parent.relationship !== "IMMUTABLE_CHILD_NO_OVERWRITE") issues.push("PARENT_PIN_INVALID");
  if (ELECTRONICS_WAVE_2_CATEGORY_IDS.length !== 6 || ELECTRONICS_WAVE_2_CATEGORY_IDS.some(categoryId => !release.categoryReadiness.some(row => row.categoryId === categoryId))) issues.push("WAVE_2_CATEGORY_COVERAGE_INVALID");
  if (new Set(release.products.map(row => row.exactProductId)).size !== release.products.length || new Set(release.products.map(row => row.configurationIdentity)).size !== release.products.length) issues.push("EXACT_IDENTITY_COLLISION");
  const productIds = new Set(release.products.map(row => row.exactProductId)); const sourceIds = new Set(release.sources.map(row => row.sourceId)); const factIds = new Set(release.comparativeFacts.map(row => row.factId));
  if (release.products.some(product => !ELECTRONICS_WAVE_2_CATEGORY_IDS.includes(product.categoryId) || !product.trApplicabilitySourceIds.some(id => release.sources.some(source => source.sourceId === id && source.market === "TR" && source.trApplicabilityAuthority === "EXACT")))) issues.push("EXACT_TR_APPLICABILITY_MISSING");
  if (release.comparativeFacts.some(fact => !productIds.has(fact.exactProductId) || !sourceIds.has(fact.sourceId))) issues.push("FACT_PROVENANCE_INVALID");
  if (release.categoryReadiness.some(row => row.candidateCount < 2 || row.manufacturerCount < 2 || row.comparableFieldCount < 4 || row.policyStatus !== "REVIEW_REQUIRED_NON_ACTIVE")) issues.push("COMPARATIVE_DIVERSITY_INSUFFICIENT");
  if (release.categoryReadiness.some(row => row.readiness === "DECISION_EVIDENCE_READY" && release.products.some(product => product.categoryId === row.categoryId && product.unresolvedIdentityDiscriminators.length))) issues.push("READY_WITH_IDENTITY_GAP");
  if (release.manuals.some(manual => !productIds.has(manual.exactProductId) || !/^sha256:[a-f0-9]{64}$/u.test(manual.sha256) || manual.locators.length === 0)) issues.push("MANUAL_BINDING_INVALID");
  if (release.decisionProjections.some(row => row.eligibleFactIds.some(id => !factIds.has(id)) || row.status !== "DRAFT_NON_ACTIVE" || row.unknownTreatment !== "NEUTRAL_FAIL_CLOSED" || row.rankingWeights !== "NONE")) issues.push("DRAFT_POLICY_UNSAFE");
  if (release.research.amazonRole !== "DISCOVERY_ONLY_ZERO_DECISION_EFFECT" || release.research.internationalRole !== "TECHNICAL_GAP_FILL_ONLY_NOT_TR_APPLICABILITY") issues.push("RESEARCH_AUTHORITY_LEAK");
  if (release.sources.some(source => source.authority === "COMMERCE_DISCOVERY" && source.decisionAuthority !== "NONE" || source.market === "GLOBAL" && source.trApplicabilityAuthority !== "NONE")) issues.push("SOURCE_AUTHORITY_LEAK");
  if (release.boundaries.l7Experience !== "ABSENT" || release.boundaries.mediaImported || release.boundaries.l10YEffect !== "NONE" || release.boundaries.amazonStatusEffect !== "NONE" || release.boundaries.activationPerformed || release.boundaries.registryChanged || release.boundaries.runtimeChanged || release.boundaries.databaseChanged || release.boundaries.pointerChanged || release.boundaries.deploymentPerformed) issues.push("BOUNDARY_LEAK");
  return Object.freeze(issues);
}
