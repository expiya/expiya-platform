export const dealerListingAgreementDraft = Object.freeze({
  artifactKind: "DEALER_MEMBERSHIP_AGREEMENT" as const,
  version: "0.2-draft-eids-ietts",
  title: "HUKUK MÜŞAVİRİ ONAYI GEREKİR — Galeri Üyelik ve İlan Sözleşmesi Taslağı",
  clauses: Object.freeze([
    "Galeri, her ilan için araç malikinden veya mevzuatın aradığı kişiden geçerli pazarlama ve ilan yayın yetkisi aldığını ve EİDS yetkilendirmesini ilan boyunca geçerli tutacağını beyan eder.",
    "Galeri, EİDS ve İETTS sorguları ile gerekli kimlik ve yetki doğrulamalarına izin verir ve gerekli doğru verileri sağlar.",
    "Galeri; ilan metni, görseller, video, fiyat, marka ve model, kilometre, hasar, boya ve değişen, garanti, takyidat ve diğer bilgileri doğru ve güncel tutar.",
    "Galeri, içeriklerin yayımlanması, teknik olarak işlenmesi, formatlanması ve gerekli ölçüde kullanıcıya sunulması için Expiya'ya sınırlı, süreli ve münhasır olmayan lisans verir; üçüncü kişi haklarını ihlal etmediğini garanti eder.",
    "Araç satıldığında, stoktan çıktığında, ilan yetkisi sona erdiğinde veya bilgiler değiştiğinde galeri ilanı gecikmeksizin günceller veya kaldırır.",
    "Expiya doğrulama yapabilir, düzeltme isteyebilir, ilanı askıya alabilir veya kaldırabilir ve denetim izi tutabilir.",
    "Yanlış veya yanıltıcı ilan, yetkisiz yayın ve üçüncü kişi hakkı ihlalinde taraflar başvuruların incelenmesinde işbirliği yapar; tüketicinin emredici hakları saklıdır ve SKYBIT sınırsız biçimde sorumsuzlaştırılmaz.",
  ]),
  contentChecksum: null,
  legalCounselApprovalRequired: true as const,
  legalCounselApproved: false as const,
  active: false as const,
  acceptanceCollectionAuthorized: false as const,
  productionUseAuthorized: false as const,
});

export function validateDealerListingAgreementDraft() {
  const codes: string[] = [];
  if (dealerListingAgreementDraft.clauses.length < 7) codes.push("REQUIRED_CLAUSES_MISSING");
  if (!dealerListingAgreementDraft.contentChecksum) codes.push("VERSIONED_CHECKSUM_REQUIRED");
  if (!dealerListingAgreementDraft.legalCounselApproved) codes.push("LEGAL_COUNSEL_APPROVAL_REQUIRED");
  if (!dealerListingAgreementDraft.active) codes.push("ARTIFACT_NOT_ACTIVE");
  return Object.freeze({ usable: codes.length === 0, codes: Object.freeze(codes), acceptanceCollectionAuthorized: false as const, productionUseAuthorized: false as const });
}
