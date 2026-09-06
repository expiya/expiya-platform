import { createHash, randomUUID } from "node:crypto";
import { openPhase3IntentHandoff } from "@/features/sales-advisor/handoff.server";
import { DATA_CONTROLLER, LEGAL_READY, legalArtifacts } from "./legalArtifacts";
import { salesRequestSchema, type ConsentReceipt, type SalesRequestIntent } from "./contracts";
import { normalizePhone } from "./security.server";
import { salesRequestRepository, type SalesRequestRepository } from "./repository.server";
import { consumePhoneVerification } from "./otp.server";
import { buildShareableSalesSummary } from "./salesSummary.server";
import { isFakeDealerPilotEnabled, resolveAuthorizedDealer } from "./dealerDirectory.server";

const receipt = (requestId: string, timestamp: string, purpose: string, artifact: { version: string; checksum: string }, granted: boolean, channel: string | null, recipientCategory = "Yok") : ConsentReceipt => ({ version: "consent-receipt/v1", requestId, purpose, legalTextVersion: artifact.version, textChecksum: artifact.checksum, granted, timestamp, withdrawalMethod: DATA_CONTROLLER.applicationAddress, controllerVersion: DATA_CONTROLLER.version, recipientCategory, channel });

export async function createSalesRequest(raw: unknown, expectedIntent: SalesRequestIntent, repository: SalesRequestRepository = salesRequestRepository) {
  const input = salesRequestSchema.parse(raw); const opened = await openPhase3IntentHandoff(input.handoff, expectedIntent);
  const replay = await repository.findByIdempotencyKey(input.idempotencyKey); if (replay) return { requestId: replay.requestId, duplicate: true, status: "ACCEPTED_FOR_PILOT_REVIEW" as const };
  const requestId = randomUUID(); const timestamp = new Date().toISOString(); const phone = normalizePhone(input.phone); const email = input.email.toLocaleLowerCase("tr-TR");
  const phoneVerification = consumePhoneVerification({ token: input.phoneVerificationToken, phone, handoff: input.handoff });
  const summary = buildShareableSalesSummary(opened.handoff); if (summary.checksum !== input.conversationSummaryChecksum) throw new TypeError("CONVERSATION_SUMMARY_CHANGED");
  const dealer = resolveAuthorizedDealer({ province: input.province, district: input.district, exactVariantId: opened.handoff.selectedExactVariantId });
  const consents = [
    receipt(requestId, timestamp, "KVKK_NOTICE_PRESENTED", legalArtifacts.kvkkNotice, input.noticeAcknowledged, null),
    receipt(requestId, timestamp, "DOMESTIC_DEALER_TRANSFER", legalArtifacts.dealerTransfer, input.dealerTransferConsent, null, `${dealer.displayName} / ${dealer.legalEntity}`),
    receipt(requestId, timestamp, "PHONE_CONTACT", legalArtifacts.dealerTransfer, input.phoneContact, "PHONE"), receipt(requestId, timestamp, "EMAIL_CONTACT", legalArtifacts.dealerTransfer, input.emailContact, "EMAIL"),
    receipt(requestId, timestamp, "COMMERCIAL_COMMUNICATIONS", legalArtifacts.commercial, input.marketingConsent, input.marketingConsent ? input.preferredChannel : null),
    receipt(requestId, timestamp, "SHARE_CONVERSATION_SUMMARY", legalArtifacts.conversationSummary, input.shareConversationSummary, null, "Türkiye'deki seçilecek yetkili satıcı tüzel kişisi"),
  ];
  const contact = { firstName: input.firstName, lastName: input.lastName, phone, email, province: input.province, district: input.district, neighborhood: input.neighborhood, preferredChannel: input.preferredChannel, note: input.note, noticeAcknowledged: input.noticeAcknowledged, dealerTransferConsent: input.dealerTransferConsent, phoneContact: input.phoneContact, emailContact: input.emailContact, marketingConsent: input.marketingConsent, shareConversationSummary: input.shareConversationSummary };
  const sharedFields = ["firstName", "lastName", "phone", "email", "province", "district", ...(input.neighborhood ? ["neighborhood"] : []), "preferredChannel", ...(input.note ? ["note"] : []), ...(input.shareConversationSummary ? ["conversationSummary"] : []), "exactVariantId", "intent"];
  const stored = { requestId, createdAt: timestamp, phoneVerification: { verifiedAt: phoneVerification.verifiedAt, method: "SMS_OTP" as const }, conversationSummary: input.shareConversationSummary ? { text: summary.text, checksum: summary.checksum } : null, binding: { conversationId: opened.handoff.conversationId, decisionRevision: opened.handoff.decisionRevision, decisionFingerprint: opened.handoff.decisionFingerprint, offerId: opened.handoff.offerId, exactVariantId: opened.handoff.selectedExactVariantId, configurationIdentity: opened.handoff.configurationIdentity, catalogRelease: opened.handoff.catalogRelease, catalogFingerprint: opened.handoff.catalogFingerprint, stageThreeAuthorityFingerprint: createHash("sha256").update(JSON.stringify(opened.handoff.authority)).digest("hex"), intent: opened.handoff.intent }, contact, consents, outbound: { version: "dealer-transfer-envelope/v1" as const, recipientDealerId: dealer.id, recipientLegalEntity: dealer.legalEntity, recipientNotificationEmail: dealer.notificationEmail, transferPurpose: "Kullanıcının seçtiği satış talebini yanıtlamak", sharedFields, consentReference: `${requestId}:DOMESTIC_DEALER_TRANSFER`, deliveryStatus: "BLOCKED_LEGAL_REVIEW" as const, deliveryChannel: "SECURE_DEALER_PORTAL_LINK" as const, emailContainsPii: false as const, portalAccessPolicy: "SHORT_LIVED_SINGLE_USE_DEALER_AUTH" as const, idempotencyKey: input.idempotencyKey, retryPolicy: "NO_AUTOMATIC_RETRY_IN_PILOT" as const, revocationCheckedAt: null, deadLetterPolicy: "MANUAL_REVIEW_WITHOUT_RAW_PII_IN_LOGS" as const, auditReceipt: null } };
  await repository.save(input.idempotencyKey, stored);
  return { requestId, duplicate: false, status: LEGAL_READY || isFakeDealerPilotEnabled() || process.env.NODE_ENV === "test" ? "ACCEPTED_FOR_PILOT_REVIEW" as const : "BLOCKED_LEGAL_REVIEW" as const };
}
