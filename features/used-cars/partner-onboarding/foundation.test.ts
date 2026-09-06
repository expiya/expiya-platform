import { describe, expect, it } from "vitest";
import { evaluateApplicationTransition } from "./applicationStateMachine";
import { evaluateActivation, hashActivationToken } from "./activation";
import { resolveDocumentRequirements, syntheticPartnerDocumentRegistryV1 } from "./documentRequirements";
import { evaluateApplicantDocumentUpload } from "./mediaBoundary";
import { validateReviewHandoff } from "./reviewHandoff";

describe("partner onboarding foundation", () => {
  it("enforces actor-scoped application transitions and reasons", () => {
    expect(evaluateApplicationTransition({ from: "READY_TO_SUBMIT", to: "SUBMITTED", actor: "APPLICANT" }).allowed).toBe(true);
    expect(evaluateApplicationTransition({ from: "SUBMITTED", to: "APPROVED", actor: "EXPIYA_REVIEWER" }).allowed).toBe(false);
    expect(evaluateApplicationTransition({ from: "DOCUMENT_REVIEW", to: "REJECTED_WITH_REASON", actor: "EXPIYA_REVIEWER" })).toMatchObject({ allowed: false, reason: "REASON_REQUIRED" });
  });
  it("resolves versioned, company-sensitive document requirements", () => {
    const requirements = resolveDocumentRequirements({ registry: syntheticPartnerDocumentRegistryV1, companyType: "FLEET_RENTAL" });
    expect(requirements.map(item => item.documentType)).toContain("BRANCH_AUTHORIZATION");
    expect(syntheticPartnerDocumentRegistryV1.productionCollectionAuthorized).toBe(false);
  });
  it("accepts only live, single-use activation grants and still refuses mutation", () => {
    const grant = { grantId: "g1", applicationId: "a1", tenantId: "t1", intendedEmailFingerprint: "mail:h1", tokenHash: hashActivationToken("secret"), issuedAt: 10, expiresAt: 100, consumedAt: null, revokedAt: null };
    expect(evaluateActivation({ grant, presentedToken: "secret", emailFingerprint: "mail:h1", now: 20 })).toMatchObject({ allowed: true, createRole: "SELLER_FULL_ACCESS", requireMfaEnrollment: true, productionMutationAuthorized: false });
    expect(evaluateActivation({ grant: { ...grant, consumedAt: 30 }, presentedToken: "secret", emailFingerprint: "mail:h1", now: 40 })).toMatchObject({ allowed: false, reason: "ALREADY_USED" });
  });
  it("fails closed for quarantine and review handoff", () => {
    expect(evaluateApplicantDocumentUpload({ applicationId: "a1", objectKey: "public/a.pdf", declaredMime: "application/pdf", detectedMime: "application/pdf", magicBytesMatched: true, sizeBytes: 10, malwareScan: "CLEAN", exifReview: "CLEARED", storageClass: "PRIVATE_QUARANTINE" }).acceptedForReview).toBe(false);
    expect(validateReviewHandoff({ version: "partner-review-handoff/v1", applicationId: "a1", applicationRevision: 1, currentStatus: "SUBMITTED", registryVersion: "v1", applicantEmailVerified: true, completenessChecksum: `sha256:${"a".repeat(64)}`, documentIds: [], consentReceiptIds: ["c1"], requestedReview: "IDENTITY", submittedAt: "2026-09-02T00:00:00Z", tenantId: null, realNotificationAuthorized: false, productionMutationAuthorized: false })).toMatchObject({ valid: true, enqueueAuthorized: false });
  });
});
