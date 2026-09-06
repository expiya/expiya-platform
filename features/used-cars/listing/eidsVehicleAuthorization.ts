export type EidsVehicleAuthorizationResult = "VERIFIED" | "NOT_AUTHORIZED" | "EXPIRED" | "REVOKED" | "UNAVAILABLE" | "MISMATCH";

export interface EidsAuthoritativeVehicleFields { readonly brand: string; readonly tradeName: string; readonly modelYear: number }
export interface EidsVehicleAuthorization {
  readonly listingId: string; readonly inventoryUnitId: string; readonly tenantId: string; readonly branchId: string;
  readonly authorizationReference: string; readonly checkedAt: string; readonly validFrom: string; readonly validUntil: string;
  readonly result: EidsVehicleAuthorizationResult; readonly authoritativeVehicle: EidsAuthoritativeVehicleFields;
  readonly source: "EIDS_RESERVED_SYNTHETIC_RESPONSE"; readonly syntheticOnly: true; readonly realProviderCallMade: false;
}

export function evaluateEidsPublicationGate(input: { readonly authorization: EidsVehicleAuthorization | null; readonly listingId: string; readonly inventoryUnitId: string; readonly tenantId: string; readonly branchId: string; readonly now: string; readonly maximumCheckAgeSeconds?: number }) {
  const codes: string[] = [], authorization = input.authorization;
  if (!authorization) codes.push("EIDS_VEHICLE_AUTHORIZATION_REQUIRED");
  else {
    if (authorization.listingId !== input.listingId || authorization.inventoryUnitId !== input.inventoryUnitId) codes.push("EIDS_VEHICLE_MISMATCH");
    if (authorization.tenantId !== input.tenantId) codes.push("EIDS_TENANT_MISMATCH");
    if (authorization.branchId !== input.branchId) codes.push("EIDS_BRANCH_MISMATCH");
    if (!authorization.authorizationReference.trim()) codes.push("EIDS_AUTHORIZATION_REFERENCE_REQUIRED");
    if (authorization.result !== "VERIFIED") codes.push(`EIDS_${authorization.result}`);
    if (authorization.validFrom > input.now || authorization.validUntil <= input.now) codes.push("EIDS_AUTHORIZATION_NOT_ACTIVE");
    const maximumAge = (input.maximumCheckAgeSeconds ?? 300) * 1000;
    if (!Number.isFinite(Date.parse(authorization.checkedAt)) || Date.parse(input.now) - Date.parse(authorization.checkedAt) > maximumAge) codes.push("EIDS_PREPUBLICATION_CHECK_STALE");
    if (authorization.realProviderCallMade || !authorization.syntheticOnly || authorization.source !== "EIDS_RESERVED_SYNTHETIC_RESPONSE") codes.push("EIDS_PROVIDER_BOUNDARY_VIOLATION");
  }
  return Object.freeze({ gatePassed: codes.length === 0, codes: Object.freeze(codes), controlledVerificationLabel: codes.length === 0 ? "EİDS araç yetkisi doğrulandı" : null, officialLogoUseAuthorized: false as const, productionProviderCallAuthorized: false as const, productionPublicationAuthorized: false as const });
}

export function authoritativeEidsFieldsMatch(input: EidsAuthoritativeVehicleFields, authorization: EidsVehicleAuthorization): boolean {
  return input.brand === authorization.authoritativeVehicle.brand && input.tradeName === authorization.authoritativeVehicle.tradeName && input.modelYear === authorization.authoritativeVehicle.modelYear;
}
