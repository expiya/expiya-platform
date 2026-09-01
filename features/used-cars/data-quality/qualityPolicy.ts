export interface InventoryQualitySnapshot {
  readonly measuredAt: string; readonly activeListings: number; readonly stalePriceListings: number; readonly staleStockListings: number; readonly requiredFieldMissingListings: number; readonly unresolvedDuplicateListings: number; readonly evidenceConflictListings: number; readonly misleadingVerifiedClaims: number; readonly invalidTaxonomyReferences: number; readonly soldStillPublicListings: number;
}
export type QualityStopCode = "EMPTY_OR_INVALID_SAMPLE" | "MISLEADING_VERIFICATION" | "INVALID_TAXONOMY_REFERENCE" | "SOLD_STILL_PUBLIC" | "UNRESOLVED_DUPLICATE" | "STALE_PRICE_RATE_HIGH" | "STALE_STOCK_RATE_HIGH" | "MISSING_FIELD_RATE_HIGH" | "EVIDENCE_CONFLICT_RATE_HIGH";
export const inventoryQualityThresholds = Object.freeze({ stalePriceRatio: .05, staleStockRatio: .1, requiredFieldMissingRatio: .01, evidenceConflictRatio: .02, unresolvedDuplicates: 0, misleadingVerifiedClaims: 0, invalidTaxonomyReferences: 0, soldStillPublicListings: 0 });
export function evaluateInventoryQuality(snapshot: InventoryQualitySnapshot) {
  const codes: QualityStopCode[] = [];
  if (!Number.isInteger(snapshot.activeListings) || snapshot.activeListings <= 0) codes.push("EMPTY_OR_INVALID_SAMPLE");
  const ratio = (count: number) => snapshot.activeListings > 0 ? count / snapshot.activeListings : 1;
  if (snapshot.misleadingVerifiedClaims > 0) codes.push("MISLEADING_VERIFICATION");
  if (snapshot.invalidTaxonomyReferences > 0) codes.push("INVALID_TAXONOMY_REFERENCE");
  if (snapshot.soldStillPublicListings > 0) codes.push("SOLD_STILL_PUBLIC");
  if (snapshot.unresolvedDuplicateListings > 0) codes.push("UNRESOLVED_DUPLICATE");
  if (ratio(snapshot.stalePriceListings) > inventoryQualityThresholds.stalePriceRatio) codes.push("STALE_PRICE_RATE_HIGH");
  if (ratio(snapshot.staleStockListings) > inventoryQualityThresholds.staleStockRatio) codes.push("STALE_STOCK_RATE_HIGH");
  if (ratio(snapshot.requiredFieldMissingListings) > inventoryQualityThresholds.requiredFieldMissingRatio) codes.push("MISSING_FIELD_RATE_HIGH");
  if (ratio(snapshot.evidenceConflictListings) > inventoryQualityThresholds.evidenceConflictRatio) codes.push("EVIDENCE_CONFLICT_RATE_HIGH");
  return Object.freeze({ healthy: codes.length === 0, stopCodes: Object.freeze(codes), newPublicationAllowed: false as const, automaticQualityWaiverAllowed: false as const });
}
