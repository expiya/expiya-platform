import type { UsedCarLeadHandoff, UsedCarLeadIntent } from "../lead-handoff/contracts";
import { usedCarConsentReceiptSchema, usedCarLeadSubmissionSchema } from "../lead-handoff/schemas";

export interface DemoLeadDryRunInput { readonly listingId: string; readonly inventoryUnitId: string; readonly intent: UsedCarLeadIntent; readonly consentGranted: boolean }
export interface DemoLeadDryRunResult { readonly accepted: boolean; readonly errorCodes: readonly string[]; readonly handoff?: UsedCarLeadHandoff; readonly executionAuthorized: false; readonly writeAuthorized: false }

export function dryRunDemoLead(input: DemoLeadDryRunInput): DemoLeadDryRunResult {
  const handoff: UsedCarLeadHandoff = Object.freeze({ version:"used-lead-handoff/v1", idempotencyKey:"11111111-1111-4111-8111-111111111111", listingId:input.listingId,
    inventoryUnitId:input.inventoryUnitId, tenantId:"demo-tenant-marmara", branchId:"demo-branch-istanbul", intent:input.intent,
    consentReceiptId:"22222222-2222-4222-8222-222222222222", sharedFieldAllowlist:["firstName","lastName","phone","province","district","preferredChannel","listingId","intent"],
    rawConversationIncluded:false, executionAuthorized:false, expiresAt:"2026-09-01T20:00:00.000Z" });
  const submission = usedCarLeadSubmissionSchema.safeParse({ version:"used-car-lead-submission/v1", handoff:JSON.stringify(handoff), idempotencyKey:handoff.idempotencyKey,
    csrfToken:"demo-csrf-token-not-for-production", contactVerificationToken:"33333333-3333-4333-8333-333333333333", firstName:"Demo", lastName:"Kullanıcı",
    phone:"5550000018", province:"İstanbul", district:"Kadıköy", preferredChannel:"PHONE", noticeAcknowledged:true, dealerTransferGranted:input.consentGranted,
    phoneContactGranted:input.consentGranted, emailContactGranted:false, marketingGranted:false, sharePreferenceSummary:false });
  const receipt = usedCarConsentReceiptSchema.safeParse({ version:"used-car-consent-receipt/v1", receiptId:handoff.consentReceiptId, leadId:"44444444-4444-4444-8444-444444444444",
    purpose:"DEALER_TRANSFER", legalTextVersion:"demo-kvkk-v0.1", legalTextChecksum:"a".repeat(64), disposition:input.consentGranted?"GRANTED":"DENIED",
    occurredAt:"2026-09-01T18:00:00.000Z", withdrawalMethod:"Partner portalından veya Expiya destek üzerinden", controllerVersion:"demo-controller-v0.1",
    ...(input.consentGranted?{recipientTenantId:handoff.tenantId}:{}), channel:"PHONE" });
  const errorCodes = [...(submission.success?[]:submission.error.issues.map(issue=>`submission.${issue.path.join(".")}:${issue.code}`)), ...(receipt.success?[]:receipt.error.issues.map(issue=>`receipt.${issue.path.join(".")}:${issue.code}`))];
  return Object.freeze({ accepted:input.consentGranted&&errorCodes.length===0, errorCodes:Object.freeze(input.consentGranted?errorCodes:["CONSENT_REQUIRED",...errorCodes]), ...(input.consentGranted&&errorCodes.length===0?{handoff}:{}), executionAuthorized:false, writeAuthorized:false });
}

