export type ArchitectureDecisionStatus = "ACCEPTED" | "SUPERSEDED";
export interface ArchitectureDecision {
  readonly decisionId: `UC-ADR-00${1 | 2 | 3 | 4 | 5 | 6}`;
  readonly title: string;
  readonly status: ArchitectureDecisionStatus;
  readonly rationale: string;
  readonly supersededBy: string | null;
}

export const usedCarsArchitectureDecisions: readonly ArchitectureDecision[] = Object.freeze([
  { decisionId: "UC-ADR-001", title: "Ayrı bounded context", status: "ACCEPTED", rationale: "Fiziksel ikinci el stok ile sıfır araç varyantı farklı yaşam döngüleridir.", supersededBy: null },
  { decisionId: "UC-ADR-002", title: "B2C aynı marka ailesi, partner ve ops ayrı güvenlik alanı", status: "ACCEPTED", rationale: "Tenant ve operasyon blast radius'u kullanıcı yüzeyinden ayrılır.", supersededBy: null },
  { decisionId: "UC-ADR-003", title: "Taxonomy ve stok kimliği ayrımı", status: "ACCEPTED", rationale: "Canonical araç bilgisi somut aracın doğruluğunu garanti etmez.", supersededBy: null },
  { decisionId: "UC-ADR-004", title: "Alan bazlı atomik kanıt", status: "ACCEPTED", rationale: "Üyelik veya tek belge bütün ilanı doğrulanmış yapamaz.", supersededBy: null },
  { decisionId: "UC-ADR-005", title: "Organik eşleştirme ve ticari görünürlük ayrımı", status: "ACCEPTED", rationale: "Tarafsızlık, açıklanabilirlik ve denetlenebilirlik korunur.", supersededBy: null },
  { decisionId: "UC-ADR-006", title: "Kontrollü ve fail-closed pilot", status: "ACCEPTED", rationale: "Ulusal ölçekten önce veri ve operasyon kalitesi ölçülür.", supersededBy: null },
]);

export function validateArchitectureDecisionRegister(decisions: readonly ArchitectureDecision[]) {
  const ids = decisions.map((decision) => decision.decisionId);
  const codes: string[] = [];
  if (new Set(ids).size !== ids.length) codes.push("DUPLICATE_DECISION_ID");
  if (decisions.some((decision) => decision.status === "SUPERSEDED" && !decision.supersededBy)) codes.push("SUPERSEDE_TARGET_REQUIRED");
  if (decisions.some((decision) => decision.status === "ACCEPTED" && decision.supersededBy)) codes.push("ACTIVE_DECISION_HAS_SUPERSEDE_TARGET");
  return Object.freeze(codes);
}
