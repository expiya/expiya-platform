export type ProductDecisionStatus = "PROPOSED" | "APPROVED" | "REJECTED";
export interface ProductDecision {
  readonly decisionId: string;
  readonly question: string;
  readonly recommendedDefault: string;
  readonly status: ProductDecisionStatus;
  readonly ownerRole: "PRODUCT" | "LEGAL" | "OPERATIONS" | "SECURITY";
  readonly productionEffectAuthorized: false;
}

export const usedCarsProductDecisions: readonly ProductDecision[] = Object.freeze([
  { decisionId: "UC-PD-001", question: "İlk pilot coğrafyası", recommendedDefault: "Tek şehirde iki kontrollü bölge", status: "APPROVED", ownerRole: "PRODUCT", productionEffectAuthorized: false },
  { decisionId: "UC-PD-002", question: "Pilot taxonomy ve stok kapsamı", recommendedDefault: "Yaygın modern binek/SUV aileleri ve sınırlı stok", status: "APPROVED", ownerRole: "PRODUCT", productionEffectAuthorized: false },
  { decisionId: "UC-PD-003", question: "B2C hesap modeli", recommendedDefault: "Tercihler için oturumsuz akış; lead öncesi açık rıza ve doğrulama", status: "PROPOSED", ownerRole: "LEGAL", productionEffectAuthorized: false },
  { decisionId: "UC-PD-004", question: "Pilot üyelik teklifi", recommendedDefault: "Süreli erken erişim; ücret ve otomatik yenileme kapalı", status: "APPROVED", ownerRole: "PRODUCT", productionEffectAuthorized: false },
  { decisionId: "UC-PD-005", question: "Ekspertiz entegrasyonu", recommendedDefault: "Pilotta yalnız bağımsız ekspertize güvenli yönlendirme", status: "APPROVED", ownerRole: "OPERATIONS", productionEffectAuthorized: false },
  { decisionId: "UC-PD-006", question: "Klasik araç pilot kapsamı", recommendedDefault: "Pilot dışında; uzman iş akışı sonraki sürüm", status: "APPROVED", ownerRole: "PRODUCT", productionEffectAuthorized: false },
  { decisionId: "UC-PD-007", question: "Partner uygulama yerleşimi", recommendedDefault: "Aynı monorepo içinde ayrı deployable app ve auth audience", status: "PROPOSED", ownerRole: "SECURITY", productionEffectAuthorized: false },
  { decisionId: "UC-PD-008", question: "Lead alıcısı ve portal sahibi", recommendedDefault: "Doğrulanmış şube kullanıcıları; named operations owner", status: "PROPOSED", ownerRole: "LEGAL", productionEffectAuthorized: false },
  { decisionId: "UC-PD-009", question: "Public fiyat geçmişi", recommendedDefault: "Lisanslı ve kaynaklı veri sağlanana kadar kapsam dışı", status: "PROPOSED", ownerRole: "LEGAL", productionEffectAuthorized: false },
  { decisionId: "UC-PD-010", question: "Sponsorlu vitrin", recommendedDefault: "MVP dışında; ileride açık Sponsorlu etiketiyle ayrı yüzey", status: "APPROVED", ownerRole: "PRODUCT", productionEffectAuthorized: false },
]);

export function assessProductDecisionRegister(decisions: readonly ProductDecision[]) {
  const duplicateIds = decisions.filter((decision, index) => decisions.findIndex((item) => item.decisionId === decision.decisionId) !== index).map((decision) => decision.decisionId);
  const unresolved = decisions.filter((decision) => decision.status === "PROPOSED").map((decision) => decision.decisionId);
  return Object.freeze({ ready: duplicateIds.length === 0 && unresolved.length === 0, duplicateIds: Object.freeze(duplicateIds), unresolved: Object.freeze(unresolved), defaultsAutoApproved: false as const, productionEffectAuthorized: false as const });
}
