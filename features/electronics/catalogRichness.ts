import type { CatalogLayerId, XpyCatalogRelease } from "../xpy/catalog/contract";

export const ELECTRONICS_RICHNESS_RELEASE_VERSION = "ELECTRONICS-CATALOG-RICHNESS-TR-v0.1" as const;

export type ElectronicsCategoryReadiness = "NO_CANDIDATES" | "SINGLE_CANDIDATE_INFORMATION_ONLY" | "MULTI_CANDIDATE_POLICY_REQUIRED" | "DECISION_DATA_READY";

export interface ElectronicsRichnessGovernance {
  readonly schemaVersion: "electronics-richness-governance/v1";
  readonly releaseVersion: typeof ELECTRONICS_RICHNESS_RELEASE_VERSION;
  readonly products: readonly {
    readonly exactProductId: string;
    readonly categoryId: string;
    readonly layers: Readonly<Record<CatalogLayerId, "COMPLETE" | "PARTIAL" | "ABSENT">>;
    readonly manual: { readonly status: "ABSENT_NO_IMMUTABLE_EXACT_ARTIFACT"; readonly decisionAuthority: "NONE" };
    readonly media: { readonly status: "ABSENT_NO_REUSE_PROVENANCE"; readonly decisionAuthority: "NONE" };
    readonly experience: { readonly status: "ABSENT_NO_GOVERNED_AGGREGATE"; readonly technicalTruthAuthority: "NONE" };
    readonly warrantyLifecycleSafety: { readonly status: "UNKNOWN_REQUIRES_EXACT_EVIDENCE"; readonly decisionUse: "NONE" };
  }[];
  readonly categoryReadiness: readonly { readonly categoryId: string; readonly candidateCount: number; readonly readiness: ElectronicsCategoryReadiness; readonly gap: string }[];
  readonly conflictsAndUnknowns: readonly { readonly exactProductId: string; readonly code: string; readonly effect: "NEUTRAL_FAIL_CLOSED" }[];
  readonly authority: { readonly technicalFactEqualsDailyLifeInterpretation: false; readonly personaDecisionUse: "NONE"; readonly commerceYEffect: "NONE"; readonly mediaYEffect: "NONE"; readonly manualYEffect: "NONE"; readonly activationPerformed: false };
}

export function validateElectronicsRichness(release: XpyCatalogRelease, governance: ElectronicsRichnessGovernance, categoryIds: readonly string[]): readonly string[] {
  const issues: string[] = [];
  const offeringIds = new Set(release.offerings.map(item => item.offeringId));
  if (offeringIds.size !== 16 || governance.products.length !== 16) issues.push("EXACT_MEMBER_COUNT_MISMATCH");
  if (governance.products.some(item => !offeringIds.has(item.exactProductId))) issues.push("GOVERNANCE_DANGLING_PRODUCT");
  if (governance.categoryReadiness.length !== categoryIds.length || categoryIds.some(id => !governance.categoryReadiness.some(row => row.categoryId === id))) issues.push("CATEGORY_READINESS_INCOMPLETE");
  if (governance.categoryReadiness.some(row => row.readiness === "DECISION_DATA_READY")) issues.push("PREMATURE_DECISION_READINESS");
  if (release.layers.l5PersonaSignals.some(item => item.decisionUse !== "NONE" || item.directCandidateEffect !== "NONE")) issues.push("PERSONA_AUTHORITY_LEAK");
  if (release.layers.l7ExperienceRules.length || release.layers.l9AdvisorKnowledge.length) issues.push("UNSUPPORTED_L7_OR_L9_AUTHORITY");
  if (governance.authority.technicalFactEqualsDailyLifeInterpretation || governance.authority.commerceYEffect !== "NONE" || governance.authority.activationPerformed) issues.push("AUTHORITY_LEAK");
  return Object.freeze(issues);
}
