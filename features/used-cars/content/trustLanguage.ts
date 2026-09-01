import type { UsedCarAssertionStatus } from "../evidence/contracts";
export interface TrustLanguage { readonly status: UsedCarAssertionStatus; readonly shortLabel: string; readonly explanation: string; readonly positiveVerificationClaimAllowed: boolean }
export const usedCarsTrustLanguage: readonly TrustLanguage[] = Object.freeze([
  { status: "EXPIYA_VERIFIED", shortLabel: "Expiya doğruladı", explanation: "Belirtilen alan, gösterilen bağımsız kaynak ve kontrol tarihi kapsamında doğrulandı.", positiveVerificationClaimAllowed: true },
  { status: "DEALER_DECLARED", shortLabel: "Satıcı beyanı", explanation: "Bilgi kurumsal satıcı tarafından sağlandı; Expiya doğrulaması değildir.", positiveVerificationClaimAllowed: false },
  { status: "USER_DECLARED", shortLabel: "Kullanıcı beyanı", explanation: "Bilgi kullanıcı tarafından sağlandı ve bağımsız doğrulama değildir.", positiveVerificationClaimAllowed: false },
  { status: "DOCUMENT_UPLOADED_UNREVIEWED", shortLabel: "Belge yüklendi · içerik doğrulanmadı", explanation: "Bir belge mevcut; içeriği ve araçla ilişkisi henüz doğrulanmadı.", positiveVerificationClaimAllowed: false },
  { status: "UNVERIFIABLE", shortLabel: "Doğrulanamadı", explanation: "Mevcut kaynaklarla bu bilgi doğrulanamadı.", positiveVerificationClaimAllowed: false },
  { status: "MISSING", shortLabel: "Eksik bilgi", explanation: "Bu alan için bilgi sağlanmadı.", positiveVerificationClaimAllowed: false },
  { status: "CONFLICTING", shortLabel: "Çelişkili bilgi", explanation: "Kaynaklar birbiriyle uyuşmuyor; karar öncesi açıklığa kavuşturulmalı.", positiveVerificationClaimAllowed: false },
  { status: "STALE", shortLabel: "Güncelliğini yitirmiş bilgi", explanation: "Bilginin geçerlilik tarihi geçti; satıcıdan güncel kayıt istenmeli.", positiveVerificationClaimAllowed: false },
]);
export function validateTrustLanguageRegistry(entries: readonly TrustLanguage[]) { const statuses = entries.map((entry) => entry.status); const codes: string[] = []; if (new Set(statuses).size !== 8 || entries.length !== 8) codes.push("STATUS_COVERAGE_REQUIRED"); if (entries.filter((entry) => entry.positiveVerificationClaimAllowed).some((entry) => entry.status !== "EXPIYA_VERIFIED")) codes.push("VERIFICATION_SCOPE_VIOLATION"); if (entries.some((entry) => !entry.shortLabel.trim() || !entry.explanation.trim())) codes.push("COPY_REQUIRED"); return Object.freeze(codes); }
