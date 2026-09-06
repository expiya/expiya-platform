import { z } from "zod";

const safeName = z.string().trim().min(1).max(80).regex(/^[\p{L}\p{M} .'-]+$/u);
const safeLocation = z.string().trim().min(1).max(80).regex(/^[\p{L}\p{M} .'-]+$/u);
const sensitiveNotePattern = /(\b\d{11}\b|kredi kart|sağlık|hastalık|tc kimlik|ehliyet|açık adres|iban)/iu;

export const usedCarLeadSubmissionSchema = z.object({
  version: z.literal("used-car-lead-submission/v1"),
  handoff: z.string().min(20).max(100_000),
  idempotencyKey: z.string().uuid(),
  csrfToken: z.string().min(16).max(200),
  contactVerificationToken: z.string().uuid(),
  firstName: safeName,
  lastName: safeName,
  phone: z.string().trim().regex(/^5\d{9}$/u).optional(),
  email: z.string().trim().email().max(254).optional(),
  province: safeLocation,
  district: safeLocation,
  preferredChannel: z.enum(["PHONE", "EMAIL"]),
  note: z.string().trim().max(500).refine((value) => !sensitiveNotePattern.test(value), "Not alanı hassas veya gereksiz veri içeremez.").optional(),
  noticeAcknowledged: z.literal(true),
  dealerTransferGranted: z.literal(true),
  phoneContactGranted: z.boolean(),
  emailContactGranted: z.boolean(),
  marketingGranted: z.boolean(),
  sharePreferenceSummary: z.boolean(),
  preferenceSummaryChecksum: z.string().regex(/^[a-f0-9]{64}$/u).optional(),
}).strict().superRefine((value, ctx) => {
  if (value.preferredChannel === "PHONE" && (!value.phone || !value.phoneContactGranted)) ctx.addIssue({ code: "custom", path: ["phone"], message: "Telefon kanalı için doğrulanabilir telefon ve kanal izni gereklidir." });
  if (value.preferredChannel === "EMAIL" && (!value.email || !value.emailContactGranted)) ctx.addIssue({ code: "custom", path: ["email"], message: "E-posta kanalı için e-posta ve kanal izni gereklidir." });
  if (value.sharePreferenceSummary !== Boolean(value.preferenceSummaryChecksum)) ctx.addIssue({ code: "custom", path: ["preferenceSummaryChecksum"], message: "Özet paylaşımı ve checksum birlikte bulunmalıdır." });
});

export type UsedCarLeadSubmission = z.infer<typeof usedCarLeadSubmissionSchema>;

export const usedCarConsentReceiptSchema = z.object({
  version: z.literal("used-car-consent-receipt/v1"),
  receiptId: z.string().uuid(),
  leadId: z.string().uuid(),
  purpose: z.enum(["KVKK_NOTICE_PRESENTED", "DEALER_TRANSFER", "PHONE_CONTACT", "EMAIL_CONTACT", "COMMERCIAL_COMMUNICATION", "SHARE_PREFERENCE_SUMMARY"]),
  legalTextVersion: z.string().trim().min(1).max(100),
  legalTextChecksum: z.string().regex(/^[a-f0-9]{64}$/u),
  disposition: z.enum(["PRESENTED", "GRANTED", "DENIED", "WITHDRAWN"]),
  occurredAt: z.string().datetime(),
  withdrawalMethod: z.string().trim().min(1).max(200),
  controllerVersion: z.string().trim().min(1).max(100),
  recipientTenantId: z.string().trim().min(3).max(120).optional(),
  channel: z.enum(["PHONE", "EMAIL"]).optional(),
}).strict().superRefine((value, ctx) => {
  if (value.purpose === "KVKK_NOTICE_PRESENTED" && value.disposition !== "PRESENTED") ctx.addIssue({ code: "custom", path: ["disposition"], message: "Aydınlatma rıza olarak kaydedilemez." });
  if (value.purpose === "DEALER_TRANSFER" && value.disposition === "GRANTED" && !value.recipientTenantId) ctx.addIssue({ code: "custom", path: ["recipientTenantId"], message: "Aktarım alıcısı belirli olmalıdır." });
});

export type UsedCarConsentReceipt = z.infer<typeof usedCarConsentReceiptSchema>;

export const partnerLeadSharedFieldAllowlist = [
  "firstName", "lastName", "phone", "email", "province", "district", "preferredChannel",
  "note", "listingId", "intent", "preferenceSummary",
] as const;

export function projectPartnerLeadFields(input: UsedCarLeadSubmission & { readonly listingId: string; readonly intent: string; readonly preferenceSummary?: string }): Readonly<Record<string, string>> {
  const output: Record<string, string> = {
    firstName: input.firstName, lastName: input.lastName, province: input.province,
    district: input.district, preferredChannel: input.preferredChannel,
    listingId: input.listingId, intent: input.intent,
  };
  if (input.phone && input.phoneContactGranted) output.phone = input.phone;
  if (input.email && input.emailContactGranted) output.email = input.email;
  if (input.note) output.note = input.note;
  if (input.sharePreferenceSummary && input.preferenceSummary) output.preferenceSummary = input.preferenceSummary;
  return Object.freeze(output);
}

