import type { ElectronicsCategoryId } from "./architectureBaseline";

export const ELECTRONICS_COVERAGE_EXPANSION_SCHEMA_VERSION =
  "electronics-catalog-coverage-expansion/v1" as const;

export type CoverageDisposition =
  | "ADMITTED_EXACT"
  | "PLAUSIBLE_EXACT_PENDING_PRIMARY_EVIDENCE"
  | "AMBIGUOUS_FAMILY"
  | "ACCESSORY_OR_BUNDLE"
  | "DUPLICATE_LISTING"
  | "FOREIGN_ONLY"
  | "RETIRED_OR_UNAVAILABLE"
  | "INSUFFICIENT_IDENTITY";

export interface AmazonListingObservation {
  readonly categoryId: ElectronicsCategoryId;
  readonly query: string;
  readonly page: number;
  readonly asin: string;
  readonly canonicalUrl: string;
  readonly title: string;
  readonly observedAt: string;
  readonly sponsored: boolean | null;
  readonly availability: "PRICE_OBSERVED" | "NO_FEATURED_OFFER" | "UNKNOWN";
  readonly priceDisplay: string | null;
  readonly seller: string | null;
  readonly fulfilment: string | null;
  readonly disposition: CoverageDisposition;
  readonly reason: string;
}

export interface CategoryCoverageGate {
  readonly categoryId: ElectronicsCategoryId;
  readonly observedAsinCount: number;
  readonly plausibleExactCount: number;
  readonly admittedExactProductCount: number;
  readonly activeRuntimeProductCount: number;
  readonly observedManufacturers: readonly string[];
  readonly observedFormFactors: readonly string[];
  readonly status: "DECISION_READY" | "COVERAGE_INCOMPLETE";
  readonly blockers: readonly string[];
}

export function validateListingObservations(
  observations: readonly AmazonListingObservation[],
): readonly string[] {
  const issues: string[] = [];
  const keys = new Set<string>();
  for (const row of observations) {
    const key = `${row.query}\u0000${row.page}\u0000${row.asin}`;
    if (keys.has(key)) issues.push(`DUPLICATE_QUERY_PAGE_ASIN:${row.asin}`);
    keys.add(key);
    if (!/^[A-Z0-9]{10}$/.test(row.asin)) issues.push(`INVALID_ASIN:${row.asin}`);
    if (row.canonicalUrl !== `https://www.amazon.com.tr/dp/${row.asin}`) {
      issues.push(`INVALID_CANONICAL_URL:${row.asin}`);
    }
    if (row.priceDisplay !== null && row.availability !== "PRICE_OBSERVED") {
      issues.push(`PRICE_WITHOUT_OBSERVED_AVAILABILITY:${row.asin}`);
    }
    if (row.disposition === "ADMITTED_EXACT") {
      issues.push(`LISTING_CANNOT_SELF_AUTHORIZE_PRODUCT:${row.asin}`);
    }
  }
  return Object.freeze(issues);
}

export function uniqueAsinCount(observations: readonly AmazonListingObservation[]): number {
  return new Set(observations.map((row) => row.asin)).size;
}
