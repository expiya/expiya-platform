import type { ElectronicsCategoryId } from "./architectureBaseline";

export const ELECTRONICS_AMAZON_PRIMARY_SCHEMA_VERSION = "electronics-amazon-tr-primary-catalog/v1" as const;
export type AmazonDiscoveryDisposition = "EXACT_ACTIVE" | "EXACT_UNAVAILABLE" | "AMBIGUOUS_OR_FAMILY_ONLY" | "ACCESSORY_OR_BUNDLE" | "FOREIGN_ONLY" | "NOT_FOUND" | "BLOCKED_UNVERIFIABLE";

export interface ElectronicsAmazonAuditRow {
  readonly categoryId: ElectronicsCategoryId;
  readonly wave: 1 | 2 | 3 | 4;
  readonly query: string;
  readonly resultText: string;
  readonly observedAt: string;
  readonly asin: string | null;
  readonly title: string | null;
  readonly canonicalAmazonUrl: string | null;
  readonly disposition: AmazonDiscoveryDisposition;
  readonly priceObserved: { readonly display: string; readonly observedAt: string; readonly authority: "L10_NONE" } | null;
  readonly seller: string | null;
  readonly fulfilment: string | null;
  readonly stockState: "OBSERVED_PRICE" | "NO_PRICE_OBSERVED" | "UNKNOWN";
  readonly sponsored: boolean | null;
  readonly confidence: "HIGH" | "MEDIUM" | "LOW";
  readonly reason: string;
}

export interface ElectronicsAmazonCandidate {
  readonly exactProductId: string;
  readonly categoryId: ElectronicsCategoryId;
  readonly wave: 1 | 2 | 3 | 4;
  readonly brand: string;
  readonly commercialModel: string;
  readonly manufacturerModelCode: string;
  readonly configurationIdentity: string;
  readonly asin: string;
  readonly amazonSourceId: string;
  readonly trApplicabilitySourceId: string;
  readonly lifecycle: "RESEARCH_CATALOG_ADMISSIBLE";
  readonly technicalAuthorityFromAmazon: false;
  readonly decisionAuthority: "NONE";
}

export interface ElectronicsAmazonQueryRun {
  readonly categoryId: ElectronicsCategoryId;
  readonly wave: 1 | 2 | 3 | 4;
  readonly query: string;
  readonly page: 1 | 2;
  readonly resultCap: number;
  readonly amazonSearchUrl: string;
  readonly observedAt: string;
  readonly resultText: string;
  readonly access: "PUBLIC_SEARCH_REACHABLE" | "PAGE_UNAVAILABLE";
}

export function validateAmazonPrimaryResearch(input: { readonly auditRows: readonly ElectronicsAmazonAuditRow[]; readonly candidates: readonly ElectronicsAmazonCandidate[]; readonly categoryIds: readonly string[] }): readonly string[] {
  const issues: string[] = [];
  const categories = input.auditRows.map(row => row.categoryId);
  if (input.auditRows.length < input.categoryIds.length || new Set(categories).size !== input.categoryIds.length || input.categoryIds.some(id => !categories.includes(id as ElectronicsCategoryId))) issues.push("ALL_CATEGORY_COVERAGE_REQUIRED");
  const asins = input.auditRows.map(row => row.asin).filter((asin): asin is string => asin !== null);
  if (new Set(asins).size !== asins.length) issues.push("DUPLICATE_ASIN_AUDIT_ROW");
  if (input.auditRows.some(row => (row.priceObserved !== null && row.priceObserved.authority !== "L10_NONE") || (row.canonicalAmazonUrl !== null && row.asin !== null && row.canonicalAmazonUrl !== `https://www.amazon.com.tr/dp/${row.asin}`))) issues.push("L10_OR_CANONICAL_URL_INVALID");
  if (input.candidates.some(candidate => candidate.lifecycle !== "RESEARCH_CATALOG_ADMISSIBLE" || candidate.technicalAuthorityFromAmazon !== false || candidate.decisionAuthority !== "NONE" || !candidate.trApplicabilitySourceId || !candidate.manufacturerModelCode)) issues.push("CANDIDATE_AUTHORITY_INVALID");
  if (new Set(input.candidates.map(candidate => candidate.asin)).size !== input.candidates.length || new Set(input.candidates.map(candidate => candidate.exactProductId)).size !== input.candidates.length || new Set(input.candidates.map(candidate => candidate.configurationIdentity)).size !== input.candidates.length) issues.push("CANDIDATE_IDENTITY_COLLISION");
  if (input.candidates.some(candidate => !["EXACT_ACTIVE", "EXACT_UNAVAILABLE"].includes(input.auditRows.find(row => row.asin === candidate.asin)?.disposition ?? ""))) issues.push("CANDIDATE_WITHOUT_EXACT_AMAZON_AUDIT");
  return Object.freeze(issues);
}

export function decisionIdentityProjection(candidates: readonly ElectronicsAmazonCandidate[]) {
  return candidates.map(({ exactProductId, categoryId, configurationIdentity }) => ({ exactProductId, categoryId, configurationIdentity }));
}
