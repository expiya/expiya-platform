import { z } from "zod";
import { isValidProvinceDistrict } from "./turkeyLocations";

export const intents = ["REQUEST_QUOTE", "REQUEST_TEST_DRIVE", "REQUEST_DEALER_CONTACT"] as const;
export type SalesRequestIntent = typeof intents[number];
export const intentLabels: Record<SalesRequestIntent, string> = { REQUEST_QUOTE: "Teklif iste", REQUEST_TEST_DRIVE: "Test sürüşü planla", REQUEST_DEALER_CONTACT: "En yakın yetkili satıcıyla görüş" };

const safeText = z.string().trim().min(1).max(80).regex(/^[\p{L}\p{M} .'-]+$/u);
export const salesRequestSchema = z.object({
  version: z.literal("phase3-sales-request/v1"), handoff: z.string().min(20).max(300_000), idempotencyKey: z.string().uuid(), csrfToken: z.string().min(16).max(200), phoneVerificationToken: z.string().uuid(),
  firstName: safeText, lastName: safeText, phone: z.string().trim().regex(/^5\d{9}$/u, "Türkiye cep telefonu 5xx xxx xx xx biçiminde olmalıdır."), email: z.string().trim().email().max(254),
  province: safeText.max(50), district: safeText.max(60), neighborhood: z.union([safeText.max(80), z.literal("")]), preferredChannel: z.enum(["PHONE", "EMAIL"]),
  note: z.string().trim().max(500).refine((value) => !/(\b\d{11}\b|kredi kart|sağlık|hastalık|tc kimlik)/iu.test(value), "Not alanı hassas veya gereksiz veri içeremez."),
  noticeAcknowledged: z.boolean(), dealerTransferConsent: z.literal(true), phoneContact: z.boolean(), emailContact: z.boolean(), marketingConsent: z.boolean(), shareConversationSummary: z.boolean(), conversationSummaryChecksum: z.string().regex(/^[a-f0-9]{64}$/u),
}).strict().superRefine((value, ctx) => {
  if (!value.noticeAcknowledged) ctx.addIssue({ code: "custom", path: ["noticeAcknowledged"], message: "Aydınlatma metninin sunulduğunu doğrulayın." });
  if (!isValidProvinceDistrict(value.province, value.district)) ctx.addIssue({ code: "custom", path: ["district"], message: "İlçe seçilen ile bağlı geçerli bir ilçe olmalıdır." });
  const channelGranted = value.preferredChannel === "PHONE" ? value.phoneContact : value.emailContact;
  if (!channelGranted) ctx.addIssue({ code: "custom", path: [`${value.preferredChannel.toLowerCase()}Contact`], message: "Seçtiğiniz iletişim kanalı için izin gereklidir." });
});

export type SalesRequestInput = z.infer<typeof salesRequestSchema>;
export type ConsentReceipt = { readonly version: "consent-receipt/v1"; readonly requestId: string; readonly purpose: string; readonly legalTextVersion: string; readonly textChecksum: string; readonly granted: boolean; readonly timestamp: string; readonly withdrawalMethod: string; readonly controllerVersion: string; readonly recipientCategory: string; readonly channel: string | null };
export type DealerTransferEnvelope = { readonly version: "dealer-transfer-envelope/v1"; readonly recipientDealerId: string; readonly recipientLegalEntity: string; readonly recipientNotificationEmail: string; readonly transferPurpose: string; readonly sharedFields: readonly string[]; readonly consentReference: string; readonly deliveryStatus: "BLOCKED_LEGAL_REVIEW" | "READY"; readonly deliveryChannel: "SECURE_DEALER_PORTAL_LINK"; readonly emailContainsPii: false; readonly portalAccessPolicy: "SHORT_LIVED_SINGLE_USE_DEALER_AUTH"; readonly idempotencyKey: string; readonly retryPolicy: "NO_AUTOMATIC_RETRY_IN_PILOT"; readonly revocationCheckedAt: string | null; readonly deadLetterPolicy: "MANUAL_REVIEW_WITHOUT_RAW_PII_IN_LOGS"; readonly auditReceipt: string | null };
