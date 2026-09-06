import type { ExperimentSurface } from "../experimentation/experimentPolicy";
export interface ExperimentAllocationBoundary { readonly surface: ExperimentSurface; readonly namespace: string; readonly allocationServiceRef: string | null; readonly allowedKeys: readonly ("anonymousBucket" | "accountStableBucket")[]; readonly tenantOrCommercialKeysAllowed: false; readonly organicRankingMutationAllowed: false; readonly personalDataStored: false; readonly configured: false }
export const usedCarsStagingExperimentAllocations: readonly ExperimentAllocationBoundary[] = Object.freeze([
  { surface: "B2C_ONBOARDING", namespace: "used-cars:experiment:b2c-onboarding:staging", allocationServiceRef: null, allowedKeys: ["anonymousBucket", "accountStableBucket"], tenantOrCommercialKeysAllowed: false, organicRankingMutationAllowed: false, personalDataStored: false, configured: false },
  { surface: "MATCH_EXPLANATION", namespace: "used-cars:experiment:match-explanation:staging", allocationServiceRef: null, allowedKeys: ["anonymousBucket"], tenantOrCommercialKeysAllowed: false, organicRankingMutationAllowed: false, personalDataStored: false, configured: false },
  { surface: "LISTING_DETAIL", namespace: "used-cars:experiment:listing-detail:staging", allocationServiceRef: null, allowedKeys: ["anonymousBucket"], tenantOrCommercialKeysAllowed: false, organicRankingMutationAllowed: false, personalDataStored: false, configured: false },
  { surface: "LEAD_CTA", namespace: "used-cars:experiment:lead-cta:staging", allocationServiceRef: null, allowedKeys: ["anonymousBucket", "accountStableBucket"], tenantOrCommercialKeysAllowed: false, organicRankingMutationAllowed: false, personalDataStored: false, configured: false },
  { surface: "PARTNER_WORKFLOW", namespace: "used-cars:experiment:partner-workflow:staging", allocationServiceRef: null, allowedKeys: ["accountStableBucket"], tenantOrCommercialKeysAllowed: false, organicRankingMutationAllowed: false, personalDataStored: false, configured: false },
]);
export function validateExperimentAllocationManifest(boundaries: readonly ExperimentAllocationBoundary[]) {
  const surfaces: readonly ExperimentSurface[] = ["B2C_ONBOARDING", "MATCH_EXPLANATION", "LISTING_DETAIL", "LEAD_CTA", "PARTNER_WORKFLOW"];
  const codes: string[] = [];
  for (const surface of surfaces) if (!boundaries.some((item) => item.surface === surface)) codes.push(`SURFACE_REQUIRED:${surface}`);
  if (new Set(boundaries.map((item) => item.namespace)).size !== boundaries.length) codes.push("NAMESPACE_ISOLATION_REQUIRED");
  for (const item of boundaries) { if (item.tenantOrCommercialKeysAllowed || item.organicRankingMutationAllowed || item.personalDataStored) codes.push(`ALLOCATION_POLICY_VIOLATION:${item.surface}`); if (item.allocationServiceRef || item.configured) codes.push(`ALLOCATION_ENABLEMENT_FORBIDDEN:${item.surface}`); }
  return Object.freeze({ valid: codes.length === 0, codes: Object.freeze(codes), realExperimentAuthorized: false as const });
}
