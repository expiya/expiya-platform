import type { VehicleMediaAsset } from "@/types/vehicleMedia";

export type VehicleMediaValidationIssue =
  | "OWNER_ATTESTATION_REQUIRED"
  | "OWNER_ATTESTATION_INCOMPLETE"
  | "COMMERCIAL_DISPLAY_NOT_ATTESTED"
  | "OWNER_ATTESTATION_FOR_NON_ATTESTED_ASSET";

export function validateVehicleMediaAsset(asset: VehicleMediaAsset): readonly VehicleMediaValidationIssue[] {
  const issues: VehicleMediaValidationIssue[] = [];
  if (asset.usagePermission === "OWNER_ATTESTED") {
    const attestation = asset.ownerAttestation;
    if (!attestation) return ["OWNER_ATTESTATION_REQUIRED"];
    if (!attestation.attestedBy.trim() || !attestation.statement.trim() || !attestation.evidenceReference.trim()
      || Number.isNaN(Date.parse(attestation.attestedAt))) issues.push("OWNER_ATTESTATION_INCOMPLETE");
    if (!attestation.permittedUses.includes("COMMERCIAL_DISPLAY")) issues.push("COMMERCIAL_DISPLAY_NOT_ATTESTED");
  } else if (asset.ownerAttestation) {
    issues.push("OWNER_ATTESTATION_FOR_NON_ATTESTED_ASSET");
  }
  return issues;
}

export function isPublishableVehicleMediaAsset(asset: VehicleMediaAsset): boolean {
  return asset.publicationState === "PUBLISHED" && validateVehicleMediaAsset(asset).length === 0;
}
