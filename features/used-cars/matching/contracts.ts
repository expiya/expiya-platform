export interface UsedCarMatchDimensions {
  readonly needFit: number;
  readonly budgetFit: number;
  readonly riskFit: number;
  readonly evidenceReadiness: number;
  readonly operationalAvailability: number;
}

export interface UsedCarMatchResult {
  readonly inventoryUnitId: string;
  readonly taxonomyFamilyId: string;
  readonly dimensions: UsedCarMatchDimensions;
  readonly reasons: readonly string[];
  readonly uncertainties: readonly string[];
  readonly safeNextSteps: readonly string[];
  readonly organic: true;
}

export interface SponsoredUsedCarPlacement {
  readonly listingId: string;
  readonly label: "SPONSORED";
  readonly campaignId: string;
}

export function assertValidMatchDimensions(dimensions: UsedCarMatchDimensions): void {
  for (const [key, value] of Object.entries(dimensions)) {
    if (!Number.isFinite(value) || value < 0 || value > 1) throw new Error(`INVALID_MATCH_DIMENSION:${key}`);
  }
}

