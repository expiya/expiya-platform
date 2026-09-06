export interface ApplicantDocumentUpload {
  readonly applicationId: string; readonly objectKey: string; readonly declaredMime: string; readonly detectedMime: string;
  readonly magicBytesMatched: boolean; readonly sizeBytes: number; readonly malwareScan: "PENDING" | "CLEAN" | "INFECTED" | "ERROR";
  readonly exifReview: "PENDING" | "CLEARED" | "REDACTION_REQUIRED"; readonly storageClass: "PRIVATE_QUARANTINE";
}
export function evaluateApplicantDocumentUpload(input: ApplicantDocumentUpload) {
  const codes: string[] = [];
  if (!input.objectKey.startsWith(`applications/${input.applicationId}/quarantine/`)) codes.push("APPLICATION_SCOPE_MISMATCH");
  if (input.storageClass !== "PRIVATE_QUARANTINE") codes.push("PRIVATE_QUARANTINE_REQUIRED");
  if (input.declaredMime !== input.detectedMime || !input.magicBytesMatched) codes.push("CONTENT_TYPE_MISMATCH");
  if (input.sizeBytes <= 0 || input.sizeBytes > 15 * 1024 * 1024) codes.push("FILE_SIZE_INVALID");
  if (input.malwareScan !== "CLEAN") codes.push("MALWARE_SCAN_NOT_CLEAN");
  if (input.exifReview !== "CLEARED") codes.push("EXIF_REVIEW_NOT_CLEARED");
  return Object.freeze({ acceptedForReview: codes.length === 0, codes: Object.freeze(codes), publicAccessAuthorized: false as const, signedReadUrlMaximumTtlSeconds: 300 as const, productionUploadAuthorized: false as const });
}
