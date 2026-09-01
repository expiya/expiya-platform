import type { LegalArtifactKind } from "./artifactRegistry";
export interface LegalAcceptanceReceipt {
  readonly receiptId: string; readonly artifactId: string; readonly artifactKind: LegalArtifactKind; readonly artifactVersion: string; readonly contentChecksum: string; readonly subjectType: "B2C_USER" | "DEALER_COMPANY" | "DEALER_USER"; readonly subjectReference: string; readonly purpose: string; readonly acceptedAt: string; readonly acceptanceMethod: "CLICKWRAP" | "E_SIGNATURE" | "SIGNED_CONTRACT"; readonly locale: "tr-TR"; readonly withdrawnAt: string | null;
}
export function validateLegalAcceptanceReceipt(receipt: LegalAcceptanceReceipt) {
  const codes: string[] = [];
  if (!/^sha256:[a-f0-9]{64}$/u.test(receipt.contentChecksum)) codes.push("INVALID_CONTENT_CHECKSUM");
  if (!receipt.subjectReference) codes.push("SUBJECT_REFERENCE_REQUIRED");
  if (!receipt.purpose.trim()) codes.push("PURPOSE_REQUIRED");
  if (receipt.withdrawnAt && receipt.withdrawnAt < receipt.acceptedAt) codes.push("INVALID_WITHDRAWAL_TIME");
  return Object.freeze(codes);
}

export type LegalChangeMateriality = "NON_MATERIAL" | "MATERIAL" | "NEW_PURPOSE" | "NEW_RECIPIENT" | "NEW_DATA_CLASS";
export function evaluateReacceptance(input: { readonly previousChecksum: string; readonly nextChecksum: string; readonly materiality: LegalChangeMateriality }) {
  const contentChanged = input.previousChecksum !== input.nextChecksum;
  return Object.freeze({ contentChanged, reacceptanceRequired: contentChanged && input.materiality !== "NON_MATERIAL", priorReceiptRemainsAuditEvidence: true as const, automaticConsentMigrationAuthorized: false as const });
}
