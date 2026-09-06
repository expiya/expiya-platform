export interface PilotCohortManifest {
  readonly cohortId: string;
  readonly cityCodes: readonly string[];
  readonly dealerTenantIds: readonly string[];
  readonly branchIds: readonly string[];
  readonly maximumActiveStock: number;
  readonly classicVehiclesIncluded: false;
  readonly individualSellersIncluded: false;
  readonly nationwideVisibilityAllowed: false;
  readonly approvedByProductId: string | null;
  readonly approvedByOperationsId: string | null;
  readonly approvedBySecurityId: string | null;
  readonly approvedByLegalPrivacyId: string | null;
  readonly evidenceChecksum: string | null;
  readonly productionEnabled: false;
}

export function validatePilotCohortManifest(manifest: PilotCohortManifest) {
  const codes: string[] = [];
  const uniqueCities = new Set(manifest.cityCodes);
  const uniqueDealers = new Set(manifest.dealerTenantIds);
  const uniqueBranches = new Set(manifest.branchIds);
  if (manifest.cityCodes.length < 1 || manifest.cityCodes.length > 2 || uniqueCities.size !== manifest.cityCodes.length) codes.push("CITY_SCOPE_INVALID");
  if (manifest.dealerTenantIds.length < 5 || manifest.dealerTenantIds.length > 8 || uniqueDealers.size !== manifest.dealerTenantIds.length) codes.push("DEALER_SCOPE_INVALID");
  if (manifest.branchIds.length < manifest.dealerTenantIds.length || manifest.branchIds.length > 16 || uniqueBranches.size !== manifest.branchIds.length) codes.push("BRANCH_SCOPE_INVALID");
  if (manifest.maximumActiveStock < 250 || manifest.maximumActiveStock > 500) codes.push("STOCK_SCOPE_INVALID");
  if (manifest.classicVehiclesIncluded || manifest.individualSellersIncluded || manifest.nationwideVisibilityAllowed) codes.push("PILOT_BOUNDARY_VIOLATION");
  const approvers = [manifest.approvedByProductId, manifest.approvedByOperationsId, manifest.approvedBySecurityId, manifest.approvedByLegalPrivacyId];
  if (approvers.some((id) => !id) || new Set(approvers).size !== 4) codes.push("FOUR_PARTY_APPROVAL_REQUIRED");
  if (!/^sha256:[a-f0-9]{64}$/u.test(manifest.evidenceChecksum ?? "")) codes.push("EVIDENCE_CHECKSUM_INVALID");
  return Object.freeze({ valid: codes.length === 0, codes: Object.freeze(codes), pilotDataWriteAuthorized: false as const, publicVisibilityAuthorized: false as const });
}
