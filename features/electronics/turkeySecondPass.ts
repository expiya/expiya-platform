import type { ElectronicsCategoryId } from "./architectureBaseline";

export const ELECTRONICS_TURKEY_SECOND_PASS_VERSION = "electronics-turkey-non-amazon-catalog/v1" as const;
export type AmazonRelation = "NOT_OBSERVED_ON_AMAZON_TR" | "OBSERVED_UNAVAILABLE" | "OBSERVED_AMBIGUOUS_OR_FAMILY_ONLY" | "OBSERVED_ACCESSORY_OR_BUNDLE_ONLY" | "OBSERVED_FOREIGN_ONLY" | "ALREADY_ADMITTED_EXACT_AMAZON";
export type TurkeyInvestigationDisposition = "ADMITTED" | "REJECTED_IDENTITY_INCOMPLETE" | "REJECTED_TR_APPLICABILITY_INCOMPLETE" | "REJECTED_CONFIGURATION_MISMATCH" | "EXCLUDED_ALREADY_AMAZON_ADMITTED";

export interface TurkeySecondPassInvestigation {
  readonly investigationId: string;
  readonly categoryId: ElectronicsCategoryId;
  readonly wave: 1 | 2 | 3 | 4;
  readonly brand: string;
  readonly model: string;
  readonly manufacturerModelCode: string | null;
  readonly configurationIdentity: string | null;
  readonly sourceId: string;
  readonly sourceUri: string;
  readonly sourceKind: "OFFICIAL_TR_MANUFACTURER" | "OFFICIAL_TR_SUPPORT" | "AUTHORIZED_TR_CHANNEL" | "INTERNATIONAL_OFFICIAL";
  readonly observedAt: string;
  readonly amazonRelation: AmazonRelation;
  readonly disposition: TurkeyInvestigationDisposition;
  readonly reason: string;
  readonly retailerTechnicalAuthority: "NONE";
  readonly internationalTrApplicabilityAuthority: "NONE";
}

export interface TurkeySecondPassCandidate {
  readonly exactProductId: string;
  readonly categoryId: ElectronicsCategoryId;
  readonly wave: 1 | 2 | 3 | 4;
  readonly brand: string;
  readonly model: string;
  readonly manufacturerModelCode: string;
  readonly configurationIdentity: string;
  readonly trApplicabilitySourceId: string;
  readonly amazonRelation: Exclude<AmazonRelation, "ALREADY_ADMITTED_EXACT_AMAZON">;
  readonly lifecycle: "GOVERNED_CATALOG_CANDIDATE";
  readonly amazonPriorityEffect: "NONE";
  readonly decisionAuthority: "NONE";
}

export function validateTurkeySecondPass(input: { readonly categoryIds: readonly string[]; readonly investigations: readonly TurkeySecondPassInvestigation[]; readonly candidates: readonly TurkeySecondPassCandidate[]; readonly amazonExactIds: readonly string[]; readonly amazonConfigurations: readonly string[] }): readonly string[] {
  const issues: string[] = [];
  if (input.categoryIds.some(categoryId => input.investigations.filter(row => row.categoryId === categoryId).length < 2)) issues.push("MULTIPLE_INVESTIGATIONS_PER_CATEGORY_REQUIRED");
  if (new Set(input.investigations.map(row => row.investigationId)).size !== input.investigations.length) issues.push("INVESTIGATION_ID_COLLISION");
  if (input.investigations.some(row => row.retailerTechnicalAuthority !== "NONE" || row.internationalTrApplicabilityAuthority !== "NONE")) issues.push("SOURCE_AUTHORITY_LEAKAGE");
  if (input.candidates.some(candidate => candidate.lifecycle !== "GOVERNED_CATALOG_CANDIDATE" || candidate.amazonPriorityEffect !== "NONE" || candidate.decisionAuthority !== "NONE" || !candidate.manufacturerModelCode || !candidate.configurationIdentity || !candidate.trApplicabilitySourceId)) issues.push("CANDIDATE_AUTHORITY_OR_IDENTITY_INVALID");
  if (input.candidates.some(candidate => input.amazonExactIds.includes(candidate.exactProductId) || input.amazonConfigurations.includes(candidate.configurationIdentity))) issues.push("AMAZON_PASS_DUPLICATION");
  if (new Set(input.candidates.map(candidate => candidate.exactProductId)).size !== input.candidates.length || new Set(input.candidates.map(candidate => candidate.configurationIdentity)).size !== input.candidates.length) issues.push("SECOND_PASS_IDENTITY_COLLISION");
  if (input.candidates.some(candidate => !input.investigations.some(row => row.categoryId === candidate.categoryId && row.configurationIdentity === candidate.configurationIdentity && row.disposition === "ADMITTED"))) issues.push("CANDIDATE_WITHOUT_ADMITTED_INVESTIGATION");
  return Object.freeze(issues);
}

export const decisionNeutralIdentitySet = (candidates: readonly TurkeySecondPassCandidate[]) => candidates.map(({ exactProductId, categoryId, configurationIdentity }) => ({ exactProductId, categoryId, configurationIdentity })).sort((a, b) => a.exactProductId.localeCompare(b.exactProductId, "en"));
