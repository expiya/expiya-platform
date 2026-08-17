import type { CatalogSnapshot, CatalogVariantSnapshot } from "../catalog/types";
import { USAGE_ARCHITECTURE_POLICY_V1 } from "../usage/policy";
import { evaluatePriceAuthority } from "./priceAuthority";
import type { PriceAuthorityPolicy } from "./policy";

export type RelativePriceSegment = "LOWEST_20" | "VALUE_20_40" | "MID_40_60" | "UPPER_60_80" | "HIGHEST_80_100";
export type RelativePriceSourceAuthority = "VERIFIED_PUBLIC_LIST" | "INTERNAL_ESTIMATE";
export interface RelativePriceSegmentProjection {
  readonly exactVariantId: string;
  readonly globalCatalogPriceSegment: RelativePriceSegment;
  readonly comparableCohortPriceSegment: RelativePriceSegment;
  readonly comparableCohortKey: string;
  readonly sourceAuthority: RelativePriceSourceAuthority;
  readonly policyId: "relative-price-segmentation";
  readonly policyVersion: "1.0.0";
  readonly cohortPolicyVersion: "usage-architecture-1.0.0";
  readonly evaluationTime: string;
  readonly evaluationWindow: string;
  readonly catalogFingerprint: string;
}
export interface RelativePriceSegmentIndex { readonly catalogFingerprint: string; readonly evaluationTime: string; readonly evaluationWindow: string; readonly projections: readonly RelativePriceSegmentProjection[]; readonly excludedVariantIds: readonly string[] }

type PricedVariant = { readonly variant: CatalogVariantSnapshot; readonly amount: number; readonly sourceAuthority: RelativePriceSourceAuthority; readonly cohortKey: string };
const segment = (percentile: number): RelativePriceSegment => percentile <= 20 ? "LOWEST_20" : percentile <= 40 ? "VALUE_20_40" : percentile <= 60 ? "MID_40_60" : percentile <= 80 ? "UPPER_60_80" : "HIGHEST_80_100";
const cohort = (variant: CatalogVariantSnapshot): string => USAGE_ARCHITECTURE_POLICY_V1.bodyStyleArchitecture[variant.decisionFacts.bodyStyle.value] ?? `BODY_STYLE:${variant.decisionFacts.bodyStyle.value}`;

function segments(entries: readonly PricedVariant[]): Map<string, RelativePriceSegment> {
  const sorted = [...entries].sort((a, b) => a.amount - b.amount || a.variant.id.localeCompare(b.variant.id)); const result = new Map<string, RelativePriceSegment>();
  for (let index = 0; index < sorted.length;) {
    let end = index; while (end + 1 < sorted.length && sorted[end + 1]!.amount === sorted[index]!.amount) end += 1;
    const percentile = ((index + end + 2) / 2) / sorted.length * 100;
    for (let cursor = index; cursor <= end; cursor += 1) result.set(sorted[cursor]!.variant.id, segment(percentile));
    index = end + 1;
  }
  return result;
}

export function projectRelativePriceSegments(input: { readonly snapshot: CatalogSnapshot; readonly evaluationTime: string; readonly priceAuthorityPolicy: PriceAuthorityPolicy }): RelativePriceSegmentIndex {
  const now = Date.parse(input.evaluationTime); const boundaries = input.snapshot.variants.flatMap((variant) => variant.activeNewPrice ? [variant.activeNewPrice.validFrom, variant.activeNewPrice.validUntil].filter((value): value is string => Boolean(value)).map(Date.parse).filter(Number.isFinite) : []).sort((a, b) => a - b); const evaluationWindow = `window-${boundaries.filter((boundary) => boundary <= now).length}`;
  const priced: PricedVariant[] = []; const excluded: string[] = [];
  for (const variant of input.snapshot.variants) {
    const authority = evaluatePriceAuthority({ price: variant.activeNewPrice, exactVariantId: variant.id, catalogFingerprint: input.snapshot.authority.catalogFingerprint, evaluationTime: input.evaluationTime, policy: input.priceAuthorityPolicy });
    const usable = authority.decisionUse === "PUBLIC_EXACT_AFFORDABILITY" || authority.decisionUse === "INTERNAL_APPROXIMATE_AFFORDABILITY";
    if (!usable || !variant.activeNewPrice) { excluded.push(variant.id); continue; }
    priced.push({ variant, amount: variant.activeNewPrice.amountTry, sourceAuthority: authority.decisionUse === "PUBLIC_EXACT_AFFORDABILITY" ? "VERIFIED_PUBLIC_LIST" : "INTERNAL_ESTIMATE", cohortKey: cohort(variant) });
  }
  const global = segments(priced); const cohortSegments = new Map<string, RelativePriceSegment>();
  for (const key of new Set(priced.map((entry) => entry.cohortKey))) for (const [id, value] of segments(priced.filter((entry) => entry.cohortKey === key))) cohortSegments.set(id, value);
  return Object.freeze({ catalogFingerprint: input.snapshot.authority.catalogFingerprint, evaluationTime: input.evaluationTime, evaluationWindow, projections: Object.freeze(priced.sort((a, b) => a.variant.id.localeCompare(b.variant.id)).map((entry) => Object.freeze({ exactVariantId: entry.variant.id, globalCatalogPriceSegment: global.get(entry.variant.id)!, comparableCohortPriceSegment: cohortSegments.get(entry.variant.id)!, comparableCohortKey: entry.cohortKey, sourceAuthority: entry.sourceAuthority, policyId: "relative-price-segmentation" as const, policyVersion: "1.0.0" as const, cohortPolicyVersion: "usage-architecture-1.0.0" as const, evaluationTime: input.evaluationTime, evaluationWindow, catalogFingerprint: input.snapshot.authority.catalogFingerprint }))), excludedVariantIds: Object.freeze(excluded.sort()) });
}

const cache = new Map<string, RelativePriceSegmentIndex>();
export function projectRelativePriceSegmentsCached(input: Parameters<typeof projectRelativePriceSegments>[0]): RelativePriceSegmentIndex {
  const now = Date.parse(input.evaluationTime); const boundaries = input.snapshot.variants.flatMap((variant) => variant.activeNewPrice ? [variant.activeNewPrice.validFrom, variant.activeNewPrice.validUntil].filter((value): value is string => Boolean(value)).map(Date.parse).filter(Number.isFinite) : []); const window = boundaries.filter((boundary) => boundary <= now).length;
  const key = `${input.snapshot.authority.catalogFingerprint}|${input.priceAuthorityPolicy.policyVersion}|usage-architecture-1.0.0|${window}`; const existing = cache.get(key); if (existing) return Object.freeze({ ...existing, evaluationTime: input.evaluationTime, projections: Object.freeze(existing.projections.map((projection) => Object.freeze({ ...projection, evaluationTime: input.evaluationTime }))) });
  const projected = projectRelativePriceSegments(input); cache.set(key, projected); return projected;
}
