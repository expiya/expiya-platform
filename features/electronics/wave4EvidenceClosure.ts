import { ELECTRONICS_CATEGORY_REGISTRY, type ElectronicsCategoryId } from "./architectureBaseline";

export const ELECTRONICS_WAVE_4_VERSION = "ELECTRONICS-WAVE-4-EVIDENCE-TR-v0.1" as const;
export const ELECTRONICS_WAVE_4_PARENT_DIGEST = "sha256:13fe5452cff50e1115f39b68c3a8382f249caa7a5d71c9651a44991a068ca773" as const;
export const ELECTRONICS_WAVE_4_CATEGORY_IDS = ELECTRONICS_CATEGORY_REGISTRY.filter(row => row.wave === 4).map(row => row.categoryId) as readonly ElectronicsCategoryId[];
export type Wave4Readiness = "DECISION_EVIDENCE_READY" | "POLICY_REVIEW_REQUIRED" | "INFORMATION_ONLY" | "BLOCKED_EVIDENCE";
export type RiskGate = "EVIDENCED" | "UNKNOWN_NEUTRAL_NON_BLOCKING" | "BLOCKED_MATERIAL" | "NOT_APPLICABLE";

export interface Wave4EvidenceRelease {
  readonly schemaVersion: "electronics-wave-4-evidence/v1"; readonly releaseVersion: typeof ELECTRONICS_WAVE_4_VERSION;
  readonly parent: { readonly releaseDigest: typeof ELECTRONICS_WAVE_4_PARENT_DIGEST; readonly relationship: "IMMUTABLE_CHILD_NO_OVERWRITE" };
  readonly research: { readonly amazonFirstDigest: `sha256:${string}`; readonly amazonRole: "DISCOVERY_ONLY_ZERO_DECISION_EFFECT"; readonly internationalRole: "TECHNICAL_GAP_FILL_ONLY_NOT_TR_APPLICABILITY" };
  readonly products: readonly { readonly exactProductId: string; readonly categoryId: ElectronicsCategoryId; readonly manufacturer: string; readonly modelCode: string; readonly configurationIdentity: string; readonly trApplicabilitySourceIds: readonly string[]; readonly unresolvedIdentityDiscriminators: readonly string[] }[];
  readonly sources: readonly { readonly sourceId: string; readonly uri: string; readonly market: "TR" | "GLOBAL"; readonly authority: "TECHNICAL" | "TR_APPLICABILITY" | "MANUAL" | "PRIVACY_HEALTH_SUBSCRIPTION_SAFETY" | "COMMERCE_DISCOVERY" | "INTERNATIONAL_BOUNDED"; readonly exactProductIds: readonly string[]; readonly trApplicabilityAuthority: "EXACT" | "NONE"; readonly decisionAuthority: "NONE" }[];
  readonly comparativeFacts: readonly { readonly factId: string; readonly exactProductId: string; readonly categoryId: ElectronicsCategoryId; readonly key: string; readonly value: string | number | boolean; readonly unit?: string; readonly sourceId: string; readonly locator: string; readonly decisionEligibility: "DRAFT_POLICY_INPUT"; readonly conflictState: "CLEAR" }[];
  readonly manuals: readonly { readonly manualId: string; readonly exactProductId: string; readonly sourceUri: string; readonly localPath: string; readonly sha256: `sha256:${string}`; readonly locators: readonly string[]; readonly layer: "L9_ADVISOR_KNOWLEDGE" }[];
  readonly riskGates: readonly { readonly categoryId: ElectronicsCategoryId; readonly privacy: RiskGate; readonly health: RiskGate; readonly subscription: RiskGate; readonly installation: RiskGate; readonly electricalSafety: RiskGate; readonly notes: readonly string[] }[];
  readonly categoryReadiness: readonly { readonly categoryId: ElectronicsCategoryId; readonly candidateCount: number; readonly manufacturerCount: number; readonly comparableFieldCount: number; readonly readiness: Wave4Readiness; readonly reasons: readonly string[]; readonly policyStatus: "REVIEW_REQUIRED_NON_ACTIVE" }[];
  readonly decisionProjections: readonly { readonly projectionId: string; readonly exactProductId: string; readonly eligibleFactIds: readonly string[]; readonly status: "DRAFT_NON_ACTIVE"; readonly unknownTreatment: "NEUTRAL_FAIL_CLOSED"; readonly rankingWeights: "NONE" }[];
  readonly rejectedInvestigations: readonly { readonly categoryId: ElectronicsCategoryId; readonly candidate: string; readonly reason: string; readonly effect: "NONE" }[];
  readonly unknownsAndConflicts: readonly { readonly exactProductId: string; readonly code: string; readonly effect: "NEUTRAL_FAIL_CLOSED" }[];
  readonly carryForward: { readonly scope: "WAVES_1_TO_3_PARENT_CHAIN"; readonly parentReleaseDigest: typeof ELECTRONICS_WAVE_4_PARENT_DIGEST; readonly parentBytesUnmodified: true };
  readonly boundaries: { readonly l7Experience: "ABSENT"; readonly mediaImported: false; readonly l10YEffect: "NONE"; readonly amazonStatusEffect: "NONE"; readonly activationPerformed: false; readonly registryChanged: false; readonly runtimeChanged: false; readonly databaseChanged: false; readonly pointerChanged: false; readonly deploymentPerformed: false };
}

export function validateWave4EvidenceClosure(release: Wave4EvidenceRelease): readonly string[] {
  const issues: string[] = [];
  if (release.parent.releaseDigest !== ELECTRONICS_WAVE_4_PARENT_DIGEST || !release.carryForward.parentBytesUnmodified) issues.push("PARENT_CHAIN_INVALID");
  if (ELECTRONICS_WAVE_4_CATEGORY_IDS.length !== 6 || ELECTRONICS_WAVE_4_CATEGORY_IDS.some(id => !release.categoryReadiness.some(row => row.categoryId === id) || !release.riskGates.some(row => row.categoryId === id))) issues.push("WAVE_4_COVERAGE_INVALID");
  if (new Set(release.products.map(row => row.exactProductId)).size !== release.products.length || new Set(release.products.map(row => row.configurationIdentity)).size !== release.products.length) issues.push("IDENTITY_COLLISION");
  const ids = new Set(release.products.map(row => row.exactProductId)); const sourceIds = new Set(release.sources.map(row => row.sourceId)); const factIds = new Set(release.comparativeFacts.map(row => row.factId));
  if (release.products.some(row => row.unresolvedIdentityDiscriminators.length || !row.trApplicabilitySourceIds.some(id => release.sources.some(source => source.sourceId === id && source.market === "TR" && source.trApplicabilityAuthority === "EXACT")))) issues.push("EXACT_TR_IDENTITY_INVALID");
  if (release.comparativeFacts.some(row => !ids.has(row.exactProductId) || !sourceIds.has(row.sourceId))) issues.push("FACT_PROVENANCE_INVALID");
  if (release.categoryReadiness.some(row => row.comparableFieldCount < 4 || row.policyStatus !== "REVIEW_REQUIRED_NON_ACTIVE" || row.readiness === "DECISION_EVIDENCE_READY" && (row.candidateCount < 2 || row.manufacturerCount < 2))) issues.push("READINESS_INVALID");
  if (release.categoryReadiness.some(row => row.readiness === "DECISION_EVIDENCE_READY" && Object.entries(release.riskGates.find(gate => gate.categoryId === row.categoryId)!).some(([key, value]) => key !== "categoryId" && key !== "notes" && value === "BLOCKED_MATERIAL"))) issues.push("READY_WITH_MATERIAL_RISK_GAP");
  if (release.manuals.some(row => !ids.has(row.exactProductId) || !/^sha256:[a-f0-9]{64}$/u.test(row.sha256) || !row.locators.length)) issues.push("MANUAL_INVALID");
  if (release.decisionProjections.some(row => row.eligibleFactIds.some(id => !factIds.has(id)) || row.status !== "DRAFT_NON_ACTIVE" || row.unknownTreatment !== "NEUTRAL_FAIL_CLOSED" || row.rankingWeights !== "NONE")) issues.push("POLICY_UNSAFE");
  if (release.sources.some(row => row.market === "GLOBAL" && row.trApplicabilityAuthority !== "NONE" || row.authority === "COMMERCE_DISCOVERY" && row.decisionAuthority !== "NONE")) issues.push("SOURCE_AUTHORITY_LEAK");
  if (release.boundaries.l7Experience !== "ABSENT" || release.boundaries.mediaImported || release.boundaries.l10YEffect !== "NONE" || release.boundaries.amazonStatusEffect !== "NONE" || release.boundaries.activationPerformed || release.boundaries.registryChanged || release.boundaries.runtimeChanged || release.boundaries.databaseChanged || release.boundaries.pointerChanged || release.boundaries.deploymentPerformed) issues.push("BOUNDARY_LEAK");
  return Object.freeze(issues);
}
