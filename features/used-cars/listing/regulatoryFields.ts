import { authoritativeEidsFieldsMatch, type EidsVehicleAuthorization } from "./eidsVehicleAuthorization";

export interface RegulatoryListingFields {
  readonly authorizationCertificateNumber: string; readonly businessLegalName: string;
  readonly brand: string; readonly tradeName: string; readonly vehicleKind: string; readonly vehicleType: string; readonly modelYear: number;
  readonly equipmentAndAccessories: readonly string[]; readonly vinLastSix: string; readonly plate: string;
  readonly fuelType: string; readonly mileageKm: number; readonly salePriceTry: number;
  readonly paintedParts: readonly string[]; readonly replacedParts: readonly string[]; readonly damageRecordNature: string;
  readonly encumbranceStatus: "NONE_DECLARED" | "PRESENT" | "UNKNOWN";
  readonly remainingManufacturerWarranty: { readonly months: number | null; readonly km: number | null } | null;
  readonly updatedAt: string; readonly eidsVerificationStatus: "VERIFIED" | "UNVERIFIED";
}

export function validateRegulatoryListingFields(input: RegulatoryListingFields, authorization: EidsVehicleAuthorization | null, now: string, maximumAgeHours = 24) {
  const codes: string[] = [];
  const required = [input.authorizationCertificateNumber, input.businessLegalName, input.brand, input.tradeName, input.vehicleKind, input.vehicleType, input.fuelType, input.plate, input.damageRecordNature];
  if (required.some(value => !value.trim())) codes.push("MANDATORY_TEXT_FIELD_MISSING");
  if (!/^[A-Z0-9]{6}$/u.test(input.vinLastSix)) codes.push("VIN_LAST_SIX_INVALID");
  if (!Number.isInteger(input.modelYear) || input.modelYear < 1886 || input.mileageKm < 0 || input.salePriceTry <= 0) codes.push("MANDATORY_NUMERIC_FIELD_INVALID");
  if (input.encumbranceStatus === "UNKNOWN") codes.push("ENCUMBRANCE_STATUS_UNKNOWN");
  if (input.eidsVerificationStatus !== "VERIFIED" || !authorization) codes.push("EIDS_VERIFICATION_REQUIRED");
  else if (!authoritativeEidsFieldsMatch(input, authorization)) codes.push("EIDS_AUTHORITATIVE_FIELD_CONFLICT");
  if (!Number.isFinite(Date.parse(input.updatedAt)) || Date.parse(now) - Date.parse(input.updatedAt) > maximumAgeHours * 3_600_000) codes.push("REGULATORY_DATA_STALE");
  return Object.freeze({ publishable: codes.length === 0, codes: Object.freeze(codes), fullVinPublic: false as const, unnecessaryDocumentsPublic: false as const, productionPublicationAuthorized: false as const });
}

export function projectPublicRegulatoryFields(input: RegulatoryListingFields) {
  return Object.freeze({ authorizationCertificateNumber: input.authorizationCertificateNumber, businessLegalName: input.businessLegalName, brand: input.brand, tradeName: input.tradeName, vehicleKind: input.vehicleKind, vehicleType: input.vehicleType, modelYear: input.modelYear, equipmentAndAccessories: input.equipmentAndAccessories, vinLastSix: input.vinLastSix, plate: input.plate, fuelType: input.fuelType, mileageKm: input.mileageKm, salePriceTry: input.salePriceTry, paintedParts: input.paintedParts, replacedParts: input.replacedParts, damageRecordNature: input.damageRecordNature, encumbranceStatus: input.encumbranceStatus, remainingManufacturerWarranty: input.remainingManufacturerWarranty, eidsVerificationStatus: input.eidsVerificationStatus });
}
