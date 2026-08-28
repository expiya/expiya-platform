import type { VehicleMediaAsset } from "@/types/vehicleMedia";

export type VehicleMediaValidationIssue =
  | "OWNER_ATTESTATION_REQUIRED"
  | "OWNER_ATTESTATION_INCOMPLETE"
  | "COMMERCIAL_DISPLAY_NOT_ATTESTED"
  | "OWNER_ATTESTATION_FOR_NON_ATTESTED_ASSET"
  | "OPEN_LICENSE_IDENTITY_VERIFICATION_REQUIRED"
  | "OPEN_LICENSE_IDENTITY_VERIFICATION_INVALID"
  | "OPEN_LICENSE_EXACT_SCOPE_REQUIRED";

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
  if (asset.usagePermission === "OPEN_LICENSE") {
    if (asset.scope !== "VARIANT" && asset.scope !== "GENERATION_BODY") issues.push("OPEN_LICENSE_EXACT_SCOPE_REQUIRED");
    const verification = asset.identityVerification;
    if (!verification) issues.push("OPEN_LICENSE_IDENTITY_VERIFICATION_REQUIRED");
    else if (verification.status !== "VERIFIED_EXACT"
      || verification.method !== "GOVERNED_REFERENCE_PIXEL_SIMILARITY_V1"
      || verification.threshold !== 0.95
      || verification.similarityScore < verification.threshold
      || verification.metadataExact !== true
      || !verification.governedReferenceAssetId.trim()
      || !/^sha256:[a-f0-9]{64}$/.test(verification.governedReferenceFileHash)
      || !/^sha256:[a-f0-9]{64}$/.test(verification.candidateFileHash)
      || verification.candidateFileHash !== asset.fileHash
      || Number.isNaN(Date.parse(verification.verifiedAt))) {
      issues.push("OPEN_LICENSE_IDENTITY_VERIFICATION_INVALID");
    }
  }
  return issues;
}

export function isPublishableVehicleMediaAsset(asset: VehicleMediaAsset): boolean {
  return asset.publicationState === "PUBLISHED" && validateVehicleMediaAsset(asset).length === 0;
}
