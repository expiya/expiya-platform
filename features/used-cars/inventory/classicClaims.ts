import type { UsedCarAssertionStatus } from "../evidence/contracts";

export type ClassicHighRiskClaim = "ORIGINAL" | "MATCHING_NUMBERS" | "COLLECTIBLE" | "PERIOD_CORRECT";

export interface ClassicClaimEvidence {
  readonly assertionStatus: UsedCarAssertionStatus;
  readonly expertReviewStatus: "NOT_REVIEWED" | "PASSED" | "FAILED" | "INCONCLUSIVE";
  readonly sourceReferenceIds: readonly string[];
  readonly chassisOrSerialEvidencePresent: boolean;
  readonly archiveOrFactoryReferencePresent: boolean;
  readonly conflictPresent: boolean;
  readonly stale: boolean;
}

export interface ClassicClaimPublicDisposition {
  readonly display: "HIDDEN" | "DEALER_DECLARATION" | "EXPIYA_VERIFIED";
  readonly wording: string;
  readonly purchaseInstructionAllowed: false;
  readonly specialistInspectionRequired: boolean;
}

export function evaluateClassicClaim(claim: ClassicHighRiskClaim, evidence: ClassicClaimEvidence): ClassicClaimPublicDisposition {
  if (evidence.conflictPresent || evidence.assertionStatus === "CONFLICTING" || evidence.assertionStatus === "MISSING") {
    return Object.freeze({ display: "HIDDEN", wording: "Bu iddia doğrulanamadı veya çelişkili.", purchaseInstructionAllowed: false, specialistInspectionRequired: true });
  }
  const exactIdentityEvidence = claim !== "MATCHING_NUMBERS" || evidence.chassisOrSerialEvidencePresent;
  const verified = evidence.assertionStatus === "EXPIYA_VERIFIED"
    && evidence.expertReviewStatus === "PASSED"
    && evidence.sourceReferenceIds.length > 0
    && evidence.archiveOrFactoryReferencePresent
    && exactIdentityEvidence
    && !evidence.stale;
  if (verified) return Object.freeze({ display: "EXPIYA_VERIFIED", wording: `${claim} iddiası belirtilen kanıt kapsamıyla doğrulandı.`, purchaseInstructionAllowed: false, specialistInspectionRequired: true });
  return Object.freeze({ display: "DEALER_DECLARATION", wording: `${claim} satıcı beyanıdır; Expiya tarafından doğrulanmış değildir.`, purchaseInstructionAllowed: false, specialistInspectionRequired: true });
}
