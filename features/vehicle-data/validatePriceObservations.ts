import type { PriceObservation } from "@/types/productionVehicle";

export type PriceQualityIssueCode =
  | "DUPLICATE_PRICE_ID"
  | "INVALID_VALIDITY_RANGE"
  | "NEW_PRICE_HAS_MILEAGE"
  | "OVERLAPPING_PRICE_CONFLICT";

export interface PriceQualityIssue {
  readonly code: PriceQualityIssueCode;
  readonly priceIds: readonly string[];
}

function rangesOverlap(left: PriceObservation, right: PriceObservation): boolean {
  const leftEnd = left.validUntil ? new Date(left.validUntil).getTime() : Number.POSITIVE_INFINITY;
  const rightEnd = right.validUntil ? new Date(right.validUntil).getTime() : Number.POSITIVE_INFINITY;
  return new Date(left.validFrom).getTime() <= rightEnd && new Date(right.validFrom).getTime() <= leftEnd;
}

export function validatePriceObservations(
  observations: readonly PriceObservation[],
): readonly PriceQualityIssue[] {
  const issues: PriceQualityIssue[] = [];
  const seen = new Set<string>();
  for (const price of observations) {
    if (seen.has(price.id)) issues.push({ code: "DUPLICATE_PRICE_ID", priceIds: [price.id] });
    seen.add(price.id);
    if (price.validUntil && new Date(price.validUntil).getTime() < new Date(price.validFrom).getTime()) {
      issues.push({ code: "INVALID_VALIDITY_RANGE", priceIds: [price.id] });
    }
    if (price.condition === "NEW" && price.mileageKm !== undefined) {
      issues.push({ code: "NEW_PRICE_HAS_MILEAGE", priceIds: [price.id] });
    }
  }

  for (let leftIndex = 0; leftIndex < observations.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < observations.length; rightIndex += 1) {
      const left = observations[leftIndex];
      const right = observations[rightIndex];
      if (
        left.vehicleVariantId === right.vehicleVariantId &&
        left.condition === right.condition &&
        left.priceType === right.priceType &&
        left.amountTry !== right.amountTry &&
        rangesOverlap(left, right)
      ) {
        issues.push({ code: "OVERLAPPING_PRICE_CONFLICT", priceIds: [left.id, right.id] });
      }
    }
  }
  return issues;
}
