export const ELECTRONICS_WAVE_1_EVIDENCE_VERSION = "ELECTRONICS-WAVE-1-EVIDENCE-TR-v0.1" as const;
export const ELECTRONICS_WAVE_1_CATEGORY_IDS = ["SMARTPHONE", "LAPTOP", "TABLET", "MONITOR", "TELEVISION", "E_READER"] as const;
export type Wave1Readiness = "DECISION_EVIDENCE_READY" | "POLICY_REVIEW_REQUIRED" | "INFORMATION_ONLY" | "BLOCKED_EVIDENCE";

export interface Wave1EvidenceRelease {
  readonly schemaVersion: "electronics-wave-1-evidence-closure/v1";
  readonly releaseVersion: typeof ELECTRONICS_WAVE_1_EVIDENCE_VERSION;
  readonly parentRichnessDigest: string;
  readonly products: readonly { readonly exactProductId: string; readonly categoryId: string; readonly manufacturer: string; readonly manufacturerModelCode: string; readonly configurationIdentity: string; readonly trApplicabilitySourceIds: readonly string[]; readonly lifecycle: "FROZEN_CANDIDATE" }[];
  readonly sources: readonly { readonly sourceId: string; readonly uri: string; readonly market: string; readonly authority: "TECHNICAL" | "TR_APPLICABILITY" | "COMMERCE_DISCOVERY" | "MANUAL_L9" | "INTERNATIONAL_BOUNDED"; readonly exactProductIds: readonly string[]; readonly trApplicabilityAuthority: "EXACT" | "NONE"; readonly decisionAuthority: "NONE" }[];
  readonly comparativeFacts: readonly { readonly factId: string; readonly exactProductId: string; readonly categoryId: string; readonly key: string; readonly value: string | number; readonly unit?: string; readonly sourceId: string; readonly locator: string; readonly decisionEligibility: "DRAFT_POLICY_INPUT" | "EXPLANATION_ONLY"; readonly conflictState: "CLEAR" | "UNKNOWN" }[];
  readonly capabilities: readonly { readonly capabilityId: string; readonly exactProductId: string; readonly factIds: readonly string[]; readonly state: "PRESENT" | "UNKNOWN"; readonly directCandidateEffect: "NONE" }[];
  readonly usageSemantics: readonly { readonly semanticId: string; readonly categoryId: string; readonly factKeys: readonly string[]; readonly status: "DRAFT_NON_ACTIVE" }[];
  readonly needs: readonly { readonly needId: string; readonly categoryId: string; readonly evidenceKeys: readonly string[]; readonly decisionUse: "NONE_DRAFT_INPUT" }[];
  readonly personaSignals: readonly { readonly signalId: string; readonly categoryId: string; readonly decisionUse: "NONE"; readonly directCandidateEffect: "NONE" }[];
  readonly dailyLifeInterpretations: readonly { readonly interpretationId: string; readonly exactProductId: string; readonly factIds: readonly string[]; readonly text: string; readonly technicalTruthAuthority: "NONE"; readonly directCandidateEffect: "NONE" }[];
  readonly decisionProjections: readonly { readonly projectionId: string; readonly exactProductId: string; readonly eligibleFactIds: readonly string[]; readonly unknownTreatment: "NEUTRAL_FAIL_CLOSED"; readonly status: "DRAFT_NON_ACTIVE" }[];
  readonly manuals: readonly { readonly manualId: string; readonly exactProductId: string; readonly path: string; readonly sourceUri: string; readonly sha256: `sha256:${string}`; readonly pages: number; readonly locator: string; readonly language: string; readonly decisionAuthority: "NONE" }[];
  readonly categoryReadiness: readonly { readonly categoryId: string; readonly candidateCount: number; readonly manufacturerCount: number; readonly readiness: Wave1Readiness; readonly blockers: readonly string[] }[];
  readonly unknownsAndConflicts: readonly { readonly exactProductId: string; readonly code: string; readonly effect: "NEUTRAL_FAIL_CLOSED" }[];
  readonly boundaries: { readonly l7Experience: "ABSENT"; readonly l10YEffect: "NONE"; readonly amazonStatusEffect: "NONE"; readonly mediaDecisionAuthority: "NONE"; readonly activationPerformed: false };
}

export function validateWave1EvidenceRelease(release: Wave1EvidenceRelease): readonly string[] {
  const issues: string[] = [];
  if (release.parentRichnessDigest !== "sha256:091968ca447271d29ccd15d50cf398c4b896ea1de410731ec1a91ec88241dd91") issues.push("PARENT_DIGEST_MISMATCH");
  if (ELECTRONICS_WAVE_1_CATEGORY_IDS.some(categoryId => !release.categoryReadiness.some(row => row.categoryId === categoryId))) issues.push("WAVE_1_CATEGORY_MISSING");
  if (release.categoryReadiness.some(row => row.candidateCount < 2)) issues.push("MULTI_CANDIDATE_COVERAGE_MISSING");
  if (new Set(release.products.map(row => row.exactProductId)).size !== release.products.length || new Set(release.products.map(row => row.configurationIdentity)).size !== release.products.length) issues.push("IDENTITY_COLLISION");
  if (release.products.some(row => !row.manufacturerModelCode || !row.configurationIdentity || !row.trApplicabilitySourceIds.length)) issues.push("EXACT_IDENTITY_OR_TR_APPLICABILITY_MISSING");
  const productIds = new Set(release.products.map(row => row.exactProductId)); const sourceIds = new Set(release.sources.map(row => row.sourceId)); const factIds = new Set(release.comparativeFacts.map(row => row.factId));
  if (release.comparativeFacts.some(row => !productIds.has(row.exactProductId) || !sourceIds.has(row.sourceId))) issues.push("DANGLING_FACT_PROVENANCE");
  if (release.dailyLifeInterpretations.some(row => !productIds.has(row.exactProductId) || row.factIds.some(id => !factIds.has(id)) || row.technicalTruthAuthority !== "NONE" || row.directCandidateEffect !== "NONE")) issues.push("DAILY_LIFE_AUTHORITY_LEAK");
  if (release.personaSignals.some(row => row.decisionUse !== "NONE" || row.directCandidateEffect !== "NONE")) issues.push("PERSONA_AUTHORITY_LEAK");
  if (release.decisionProjections.some(row => row.eligibleFactIds.some(id => !factIds.has(id)) || row.unknownTreatment !== "NEUTRAL_FAIL_CLOSED" || row.status !== "DRAFT_NON_ACTIVE")) issues.push("DECISION_PROJECTION_UNSAFE");
  if (release.manuals.some(row => !productIds.has(row.exactProductId) || !row.sha256.startsWith("sha256:") || row.pages < 1 || !row.locator || row.decisionAuthority !== "NONE")) issues.push("MANUAL_BINDING_INVALID");
  if (release.boundaries.l7Experience !== "ABSENT" || release.boundaries.l10YEffect !== "NONE" || release.boundaries.amazonStatusEffect !== "NONE" || release.boundaries.activationPerformed) issues.push("BOUNDARY_LEAK");
  return Object.freeze(issues);
}
