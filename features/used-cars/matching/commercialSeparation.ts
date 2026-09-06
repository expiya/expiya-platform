import type { SponsoredUsedCarPlacement, UsedCarMatchResult } from "./contracts";

export interface DealerCommercialContext {
  readonly tenantId: string;
  readonly planCode: string;
  readonly monthlyFeeTry: number;
  readonly sponsoredCampaignIds: readonly string[];
}

export interface OrganicRankingInput {
  readonly matches: readonly UsedCarMatchResult[];
  readonly policyVersion: string;
  readonly catalogReleaseVersion: string;
}

export function assertOrganicRankingInput(value: OrganicRankingInput & Partial<DealerCommercialContext>): void {
  for (const forbidden of ["tenantId", "planCode", "monthlyFeeTry", "sponsoredCampaignIds"] as const) {
    if (forbidden in value) throw new Error(`COMMERCIAL_FIELD_FORBIDDEN_IN_ORGANIC_RANKING:${forbidden}`);
  }
}

export interface SearchSurfaceComposition {
  readonly organic: readonly UsedCarMatchResult[];
  readonly sponsored: readonly SponsoredUsedCarPlacement[];
  readonly streamsMixed: false;
}

export function composeSearchSurface(organic: readonly UsedCarMatchResult[], sponsored: readonly SponsoredUsedCarPlacement[]): SearchSurfaceComposition {
  if (sponsored.some((placement) => placement.label !== "SPONSORED")) throw new Error("SPONSORED_LABEL_REQUIRED");
  return Object.freeze({ organic: Object.freeze([...organic]), sponsored: Object.freeze([...sponsored]), streamsMixed: false });
}

