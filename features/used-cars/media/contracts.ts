export type UsedCarMediaKind = "VEHICLE_IMAGE" | "DOCUMENT";
export type UsedCarMediaState =
  | "UPLOADED_QUARANTINED" | "STRUCTURE_VALIDATED" | "MALWARE_SCAN_PASSED"
  | "PRIVACY_REVIEW_PASSED" | "IDENTITY_REVIEW_PASSED" | "PUBLIC_RENDITION_READY"
  | "PRIVATE_APPROVED" | "REJECTED" | "REVOKED";

export interface UsedCarMediaAsset {
  readonly id: string;
  readonly tenantId: string;
  readonly inventoryUnitId: string;
  readonly kind: UsedCarMediaKind;
  readonly state: UsedCarMediaState;
  readonly storageClass: "QUARANTINE_PRIVATE" | "PRIVATE" | "PUBLIC_RENDITION";
  readonly declaredMimeType: string;
  readonly detectedMimeType: string | null;
  readonly byteSize: number;
  readonly sha256: string;
  readonly malwareScan: "NOT_RUN" | "PASSED" | "FAILED" | "ERROR";
  readonly exifRemoved: boolean;
  readonly piiReview: "NOT_RUN" | "PASSED" | "FAILED" | "MANUAL_REVIEW";
  readonly identityReview: "NOT_REQUIRED" | "NOT_RUN" | "PASSED" | "FAILED" | "MANUAL_REVIEW";
  readonly rightsConfirmed: boolean;
  readonly derivedFromAssetId?: string;
}

export type MediaGateCode =
  | "NOT_PUBLIC_RENDITION" | "DOCUMENT_PUBLICATION_FORBIDDEN" | "MIME_NOT_ALLOWED"
  | "MIME_MISMATCH" | "SIZE_INVALID" | "MALWARE_SCAN_REQUIRED"
  | "EXIF_NOT_REMOVED" | "PII_REVIEW_REQUIRED" | "IDENTITY_REVIEW_REQUIRED"
  | "RIGHTS_NOT_CONFIRMED" | "DERIVATION_MISSING";

const allowedImageMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export function evaluatePublicMediaGate(asset: UsedCarMediaAsset): { readonly publishable: boolean; readonly codes: readonly MediaGateCode[] } {
  const codes: MediaGateCode[] = [];
  if (asset.state !== "PUBLIC_RENDITION_READY" || asset.storageClass !== "PUBLIC_RENDITION") codes.push("NOT_PUBLIC_RENDITION");
  if (asset.kind === "DOCUMENT") codes.push("DOCUMENT_PUBLICATION_FORBIDDEN");
  if (!allowedImageMimeTypes.has(asset.detectedMimeType ?? "")) codes.push("MIME_NOT_ALLOWED");
  if (asset.declaredMimeType !== asset.detectedMimeType) codes.push("MIME_MISMATCH");
  if (!Number.isInteger(asset.byteSize) || asset.byteSize <= 0 || asset.byteSize > 15 * 1024 * 1024) codes.push("SIZE_INVALID");
  if (asset.malwareScan !== "PASSED") codes.push("MALWARE_SCAN_REQUIRED");
  if (!asset.exifRemoved) codes.push("EXIF_NOT_REMOVED");
  if (asset.piiReview !== "PASSED") codes.push("PII_REVIEW_REQUIRED");
  if (asset.identityReview !== "PASSED") codes.push("IDENTITY_REVIEW_REQUIRED");
  if (!asset.rightsConfirmed) codes.push("RIGHTS_NOT_CONFIRMED");
  if (!asset.derivedFromAssetId) codes.push("DERIVATION_MISSING");
  return Object.freeze({ publishable: codes.length === 0, codes: Object.freeze(codes) });
}

export function canTransitionMedia(from: UsedCarMediaState, to: UsedCarMediaState): boolean {
  const next: Readonly<Record<UsedCarMediaState, readonly UsedCarMediaState[]>> = {
    UPLOADED_QUARANTINED: ["STRUCTURE_VALIDATED", "REJECTED"],
    STRUCTURE_VALIDATED: ["MALWARE_SCAN_PASSED", "REJECTED"],
    MALWARE_SCAN_PASSED: ["PRIVACY_REVIEW_PASSED", "REJECTED"],
    PRIVACY_REVIEW_PASSED: ["IDENTITY_REVIEW_PASSED", "PRIVATE_APPROVED", "REJECTED"],
    IDENTITY_REVIEW_PASSED: ["PUBLIC_RENDITION_READY", "PRIVATE_APPROVED", "REJECTED"],
    PUBLIC_RENDITION_READY: ["REVOKED"], PRIVATE_APPROVED: ["REVOKED"], REJECTED: [], REVOKED: [],
  };
  return next[from].includes(to);
}
