import type { Wave1EvidenceRelease } from "./wave1EvidenceClosure";
import { ELECTRONICS_WAVE_1_CATEGORY_IDS } from "./wave1EvidenceClosure";

export const ELECTRONICS_WAVE_1_REPAIR_VERSION = "ELECTRONICS-WAVE-1-DIVERSITY-REPAIR-TR-v0.1" as const;
export const ELECTRONICS_WAVE_1_PARENT_DIGEST = "sha256:2545954078b5cddbafcb0acc7251301b6c0790b94aca6b7d4ac6bdfeb9e2997e" as const;

export interface Wave1DiversityRepairRelease {
  readonly schemaVersion: "electronics-wave-1-diversity-repair/v1";
  readonly releaseVersion: typeof ELECTRONICS_WAVE_1_REPAIR_VERSION;
  readonly parentReleaseDigest: typeof ELECTRONICS_WAVE_1_PARENT_DIGEST;
  readonly products: Wave1EvidenceRelease["products"];
  readonly sources: Wave1EvidenceRelease["sources"];
  readonly comparativeFacts: Wave1EvidenceRelease["comparativeFacts"];
  readonly capabilities: Wave1EvidenceRelease["capabilities"];
  readonly usageSemantics: Wave1EvidenceRelease["usageSemantics"];
  readonly needs: Wave1EvidenceRelease["needs"];
  readonly personaSignals: Wave1EvidenceRelease["personaSignals"];
  readonly dailyLifeInterpretations: Wave1EvidenceRelease["dailyLifeInterpretations"];
  readonly decisionProjections: Wave1EvidenceRelease["decisionProjections"];
  readonly manuals: Wave1EvidenceRelease["manuals"];
  readonly categoryReadiness: readonly { readonly categoryId: string; readonly candidateCount: number; readonly manufacturerCount: number; readonly readiness: "DECISION_EVIDENCE_READY"; readonly policyStatus: "REVIEW_REQUIRED_NON_ACTIVE" }[];
  readonly carryForward: { readonly categories: readonly ["TELEVISION", "E_READER"]; readonly parentSubsetDigest: `sha256:${string}`; readonly childSubsetDigest: `sha256:${string}`; readonly byteEquivalent: true };
  readonly unknownsAndConflicts: Wave1EvidenceRelease["unknownsAndConflicts"];
  readonly boundaries: Wave1EvidenceRelease["boundaries"];
}

export function validateWave1DiversityRepair(release: Wave1DiversityRepairRelease): readonly string[] {
  const issues: string[] = [];
  if (release.parentReleaseDigest !== ELECTRONICS_WAVE_1_PARENT_DIGEST) issues.push("PARENT_DIGEST_MISMATCH");
  if (ELECTRONICS_WAVE_1_CATEGORY_IDS.some(categoryId => !release.categoryReadiness.some(row => row.categoryId === categoryId))) issues.push("CATEGORY_READINESS_MISSING");
  const repairedCategories = new Set(["SMARTPHONE", "LAPTOP", "TABLET", "MONITOR"]);
  if (release.categoryReadiness.some(row => row.candidateCount < 2 || repairedCategories.has(row.categoryId) && row.manufacturerCount < 2 || row.readiness !== "DECISION_EVIDENCE_READY" || row.policyStatus !== "REVIEW_REQUIRED_NON_ACTIVE")) issues.push("DIVERSITY_OR_READINESS_INSUFFICIENT");
  if (new Set(release.products.map(row => row.exactProductId)).size !== release.products.length || new Set(release.products.map(row => row.configurationIdentity)).size !== release.products.length) issues.push("IDENTITY_COLLISION");
  const productIds = new Set(release.products.map(row => row.exactProductId)); const sourceIds = new Set(release.sources.map(row => row.sourceId)); const factIds = new Set(release.comparativeFacts.map(row => row.factId));
  if (release.products.some(row => !row.trApplicabilitySourceIds.some(id => release.sources.some(source => source.sourceId === id && source.market === "TR" && source.trApplicabilityAuthority === "EXACT")))) issues.push("TR_APPLICABILITY_MISSING");
  if (release.comparativeFacts.some(row => !productIds.has(row.exactProductId) || !sourceIds.has(row.sourceId))) issues.push("FACT_PROVENANCE_INVALID");
  if (release.decisionProjections.some(row => row.eligibleFactIds.some(id => !factIds.has(id)) || row.status !== "DRAFT_NON_ACTIVE" || row.unknownTreatment !== "NEUTRAL_FAIL_CLOSED")) issues.push("PROJECTION_UNSAFE");
  if (release.personaSignals.some(row => row.decisionUse !== "NONE" || row.directCandidateEffect !== "NONE") || release.dailyLifeInterpretations.some(row => row.technicalTruthAuthority !== "NONE" || row.directCandidateEffect !== "NONE")) issues.push("SEMANTIC_AUTHORITY_LEAK");
  if (!release.carryForward.byteEquivalent || release.carryForward.parentSubsetDigest !== release.carryForward.childSubsetDigest) issues.push("UNCHANGED_CATEGORY_DRIFT");
  if (release.boundaries.l7Experience !== "ABSENT" || release.boundaries.l10YEffect !== "NONE" || release.boundaries.amazonStatusEffect !== "NONE" || release.boundaries.activationPerformed) issues.push("BOUNDARY_LEAK");
  return Object.freeze(issues);
}
