import { describe, expect, it } from "vitest";
import { evaluatePartnerPortalGrant, type PartnerPortalAccessGrant } from "./lead-handoff/portalGrant";
import { projectPartnerLeadFields, usedCarConsentReceiptSchema, usedCarLeadSubmissionSchema } from "./lead-handoff/schemas";
import { canTransitionPersonalData, determineRetentionAction, evaluateConsentWithdrawal } from "./retention/lifecycle";

const validLead = {
  version: "used-car-lead-submission/v1", handoff: `used.${"a".repeat(40)}`,
  idempotencyKey: "c4413656-c96d-4e9d-a8ea-9f5c0c1f637b", csrfToken: "csrf-token-1234567890",
  contactVerificationToken: "2fd8cc71-e20b-4a5a-a726-b0898b366fb0",
  firstName: "Ayşe", lastName: "Yılmaz", phone: "5321234567", email: "ayse@example.com",
  province: "İstanbul", district: "Kadıköy", preferredChannel: "PHONE",
  noticeAcknowledged: true, dealerTransferGranted: true, phoneContactGranted: true,
  emailContactGranted: false, marketingGranted: false, sharePreferenceSummary: false,
};

describe("used-cars lead minimization and consent", () => {
  it("strictly validates channel permission and rejects sensitive notes", () => {
    expect(usedCarLeadSubmissionSchema.safeParse(validLead).success).toBe(true);
    expect(usedCarLeadSubmissionSchema.safeParse({ ...validLead, phoneContactGranted: false }).success).toBe(false);
    expect(usedCarLeadSubmissionSchema.safeParse({ ...validLead, note: "TC kimlik 12345678901" }).success).toBe(false);
    expect(usedCarLeadSubmissionSchema.safeParse({ ...validLead, birthDate: "1990-01-01" }).success).toBe(false);
  });

  it("shares only consented contact channels and never includes marketing state", () => {
    const parsed = usedCarLeadSubmissionSchema.parse(validLead);
    const projected = projectPartnerLeadFields({ ...parsed, listingId: "listing-1", intent: "REQUEST_QUOTE" });
    expect(projected).toMatchObject({ phone: "5321234567", listingId: "listing-1" });
    expect(projected).not.toHaveProperty("email");
    expect(projected).not.toHaveProperty("marketingGranted");
    expect(projected).not.toHaveProperty("handoff");
  });

  it("keeps notice presentation distinct from consent and binds dealer transfer recipient", () => {
    const base = {
      version: "used-car-consent-receipt/v1", receiptId: "b3613656-c96d-4e9d-a8ea-9f5c0c1f637b",
      leadId: "a3613656-c96d-4e9d-a8ea-9f5c0c1f637b", legalTextVersion: "v1",
      legalTextChecksum: "a".repeat(64), occurredAt: "2026-09-01T10:00:00.000Z",
      withdrawalMethod: "privacy@example.com", controllerVersion: "draft-v1",
    };
    expect(usedCarConsentReceiptSchema.safeParse({ ...base, purpose: "KVKK_NOTICE_PRESENTED", disposition: "PRESENTED" }).success).toBe(true);
    expect(usedCarConsentReceiptSchema.safeParse({ ...base, purpose: "KVKK_NOTICE_PRESENTED", disposition: "GRANTED" }).success).toBe(false);
    expect(usedCarConsentReceiptSchema.safeParse({ ...base, purpose: "DEALER_TRANSFER", disposition: "GRANTED" }).success).toBe(false);
    expect(usedCarConsentReceiptSchema.safeParse({ ...base, purpose: "DEALER_TRANSFER", disposition: "GRANTED", recipientTenantId: "tenant-a" }).success).toBe(true);
  });
});

describe("used-cars partner portal grant", () => {
  const grant: PartnerPortalAccessGrant = {
    version: "used-partner-portal-grant/v1", grantId: "grant-1", leadId: "lead-1",
    recipientTenantId: "tenant-a", recipientBranchId: "branch-a", recipientActorId: "advisor-a",
    allowedAction: "LEAD_VIEW_ONCE", issuedAt: "2026-09-01T10:00:00.000Z",
    expiresAt: "2026-09-01T10:15:00.000Z", consumedAt: null, revokedAt: null,
    consentReceiptId: "receipt-1", executionAuthorized: false,
  };
  const actor = { actorId: "advisor-a", tenantId: "tenant-a", branchIds: ["branch-a"], mfaVerified: true };

  it("allows exactly the bound actor, tenant and branch inside the time window", () => {
    expect(evaluatePartnerPortalGrant({ grant, actor, now: "2026-09-01T10:05:00.000Z", consentActive: true })).toBe("ALLOW_ONCE");
    expect(evaluatePartnerPortalGrant({ grant, actor: { ...actor, tenantId: "tenant-b" }, now: "2026-09-01T10:05:00.000Z", consentActive: true })).toBe("TENANT_MISMATCH");
    expect(evaluatePartnerPortalGrant({ grant, actor: { ...actor, mfaVerified: false }, now: "2026-09-01T10:05:00.000Z", consentActive: true })).toBe("MFA_REQUIRED");
  });

  it("fails closed for consumed, revoked, expired or withdrawn grants", () => {
    expect(evaluatePartnerPortalGrant({ grant: { ...grant, consumedAt: "2026-09-01T10:02:00.000Z" }, actor, now: "2026-09-01T10:05:00.000Z", consentActive: true })).toBe("ALREADY_CONSUMED");
    expect(evaluatePartnerPortalGrant({ grant: { ...grant, revokedAt: "2026-09-01T10:02:00.000Z" }, actor, now: "2026-09-01T10:05:00.000Z", consentActive: true })).toBe("REVOKED");
    expect(evaluatePartnerPortalGrant({ grant, actor, now: "2026-09-01T10:15:00.000Z", consentActive: true })).toBe("EXPIRED");
    expect(evaluatePartnerPortalGrant({ grant, actor, now: "2026-09-01T10:05:00.000Z", consentActive: false })).toBe("CONSENT_WITHDRAWN");
  });
});

describe("used-cars retention and deletion lifecycle", () => {
  it("selects legal hold, active purpose, approved retention or deletion deterministically", () => {
    const base = { legalBasisActive: false, purposeActive: false, retentionUntil: null, legalHoldUntil: null, now: "2026-09-01T00:00:00.000Z" };
    expect(determineRetentionAction({ ...base, legalHoldUntil: "2026-10-01T00:00:00.000Z" })).toBe("APPLY_LEGAL_HOLD");
    expect(determineRetentionAction({ ...base, legalBasisActive: true, purposeActive: true })).toBe("KEEP_ACTIVE");
    expect(determineRetentionAction({ ...base, retentionUntil: "2026-10-01T00:00:00.000Z" })).toBe("KEEP_UNTIL_APPROVED_DATE");
    expect(determineRetentionAction(base)).toBe("DELETE_OR_ANONYMIZE");
  });

  it("prevents deletion bypass and treats backup expiry separately", () => {
    expect(canTransitionPersonalData("ACTIVE", "DESTROYED")).toBe(false);
    expect(canTransitionPersonalData("DELETION_DUE", "DELETION_IN_PROGRESS")).toBe(true);
    expect(canTransitionPersonalData("DELETED_PRIMARY", "BACKUP_EXPIRY_PENDING")).toBe(true);
    expect(canTransitionPersonalData("BACKUP_EXPIRY_PENDING", "DESTROYED")).toBe(true);
    expect(canTransitionPersonalData("DESTROYED", "ACTIVE")).toBe(false);
  });

  it("applies consent withdrawal prospectively", () => {
    expect(evaluateConsentWithdrawal(null)).toEqual({ futureConsentProcessingBlocked: true, pendingPortalGrantsRevoked: true, deliveredRecipientNotificationRequired: false, priorLawfulProcessingReversed: false });
    expect(evaluateConsentWithdrawal("2026-09-01T10:00:00.000Z")).toMatchObject({ pendingPortalGrantsRevoked: false, deliveredRecipientNotificationRequired: true, priorLawfulProcessingReversed: false });
  });
});
