import type { VehicleMediaAsset } from "@/types/vehicleMedia";
import {
  GOVERNED_PRODUCT_MEDIA_SCHEMA,
  validateGovernedProductMedia,
  type GovernedMediaCandidate,
  type GovernedProductMedia,
} from "@/features/media/governedProductMedia";

export type VehicleMediaValidationIssue =
  | "OWNER_ATTESTATION_REQUIRED"
  | "OWNER_ATTESTATION_INCOMPLETE"
  | "COMMERCIAL_DISPLAY_NOT_ATTESTED"
  | "OWNER_ATTESTATION_FOR_NON_ATTESTED_ASSET"
  | "OPEN_LICENSE_IDENTITY_VERIFICATION_REQUIRED"
  | "OPEN_LICENSE_IDENTITY_VERIFICATION_INVALID"
  | "OPEN_LICENSE_EXACT_SCOPE_REQUIRED"
  | "REMOTE_PREVIEW_SOURCE_REQUIRED"
  | "REMOTE_PREVIEW_ATTRIBUTION_REQUIRED"
  | "OWNER_ATTESTATION_NOT_A_RIGHTS_LICENSE"
  | "GOVERNED_MEDIA_INVALID";

function legacyOpenLicenseGovernance(asset: VehicleMediaAsset): GovernedProductMedia | undefined {
  if (asset.usagePermission !== "OPEN_LICENSE") return undefined;
  return {
    schemaVersion: GOVERNED_PRODUCT_MEDIA_SCHEMA,
    disposition: asset.scope === "VARIANT" ? "EXACT_LICENSED" : "MODEL_FAMILY_LICENSED",
    rightsBasis: "OPEN_LICENSE",
    provider: asset.rightsHolder,
    permissionReference: asset.licenseUrl ?? null,
    allowedSurfaces: ["STAGE_1_CARD", "STAGE_2_HERO", "DETAIL_GALLERY"],
    requiredLinkTarget: null,
    requiredDisclosure: asset.scope === "VARIANT" ? null : "Temsilî model ailesi görseli; donanım, renk ve model yılı farklı olabilir.",
    requiredAttribution: asset.attributionText ?? null,
    cache: { mode: "PERSISTENT", expiresAt: null, maxAgeSeconds: null },
    retrievedAt: asset.reviewedAt,
    identity: {
      scope: asset.scope === "VARIANT" ? "EXACT_PRODUCT" : "MODEL_FAMILY",
      evidence: asset.identityVerification ? [
        `Governed reference ${asset.identityVerification.governedReferenceAssetId}`,
        `Pixel similarity ${asset.identityVerification.similarityScore}`,
      ] : hasModelFamilySourceBinding(asset) ? [`The open-repository source title contains every normalized ${asset.model} model token and is bound to ${asset.bodyStyle ?? "the recorded model family"}.`] : [],
    },
    revokedAt: null,
  };
}

function normalizedTokens(value: string): readonly string[] {
  return value.normalize("NFKD").replace(/\p{M}/gu, "").toLocaleLowerCase("en-US").replace(/[^a-z0-9]+/gu, " ").trim().split(/\s+/u).filter(token => token.length >= 2);
}

function hasModelFamilySourceBinding(asset: VehicleMediaAsset): boolean {
  if (asset.scope !== "MODEL" && asset.scope !== "MODEL_BODY") return false;
  let source = asset.sourcePageUrl;
  try { source = decodeURIComponent(source); } catch { /* Keep the original URL when malformed escapes are present. */ }
  const sourceTokens = new Set(normalizedTokens(source));
  const modelTokens = normalizedTokens(asset.model);
  return modelTokens.length > 0 && modelTokens.every(token => sourceTokens.has(token));
}

export function toGovernedVehicleMediaCandidate(asset: VehicleMediaAsset): GovernedMediaCandidate | undefined {
  const governance = asset.governance ?? legacyOpenLicenseGovernance(asset);
  if (!governance) return undefined;
  return governance.disposition === "AFFILIATE_API_TRANSIENT"
    ? { governance, remoteSrc: asset.originalAssetUrl }
    : { governance, localSrc: asset.storagePath };
}

export function validateVehicleMediaAsset(asset: VehicleMediaAsset): readonly VehicleMediaValidationIssue[] {
  const issues: VehicleMediaValidationIssue[] = [];
  if (asset.usagePermission === "OWNER_ATTESTED") {
    const attestation = asset.ownerAttestation;
    if (!attestation) return ["OWNER_ATTESTATION_REQUIRED"];
    if (!attestation.attestedBy.trim() || !attestation.statement.trim() || !attestation.evidenceReference.trim()
      || Number.isNaN(Date.parse(attestation.attestedAt))) issues.push("OWNER_ATTESTATION_INCOMPLETE");
    if (!attestation.permittedUses.includes("COMMERCIAL_DISPLAY")) issues.push("COMMERCIAL_DISPLAY_NOT_ATTESTED");
    if (!asset.governance || asset.governance.rightsBasis !== "OWNED_OR_COMMISSIONED") issues.push("OWNER_ATTESTATION_NOT_A_RIGHTS_LICENSE");
  } else if (asset.ownerAttestation) {
    issues.push("OWNER_ATTESTATION_FOR_NON_ATTESTED_ASSET");
  }
  if (asset.usagePermission === "REMOTE_PREVIEW") {
    if (!asset.sourcePageUrl.trim() || !asset.originalAssetUrl?.trim() || asset.fileHash || asset.storagePath.trim()) issues.push("REMOTE_PREVIEW_SOURCE_REQUIRED");
    if (!asset.attributionText?.trim()) issues.push("REMOTE_PREVIEW_ATTRIBUTION_REQUIRED");
  }
  if (asset.usagePermission === "OPEN_LICENSE") {
    if (!asset.licenseName?.trim() || !asset.licenseUrl?.trim() || !asset.attributionText?.trim()) issues.push("OPEN_LICENSE_EXACT_SCOPE_REQUIRED");
    const verification = asset.identityVerification;
    if (!verification) {
      if (!hasModelFamilySourceBinding(asset)) issues.push("OPEN_LICENSE_IDENTITY_VERIFICATION_REQUIRED");
    } else if (verification.status !== "VERIFIED_EXACT"
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
  const governed = toGovernedVehicleMediaCandidate(asset);
  if (!governed || validateGovernedProductMedia(governed).length) issues.push("GOVERNED_MEDIA_INVALID");
  return issues;
}

export function isPublishableVehicleMediaAsset(asset: VehicleMediaAsset): boolean {
  return asset.publicationState === "PUBLISHED" && validateVehicleMediaAsset(asset).length === 0;
}
