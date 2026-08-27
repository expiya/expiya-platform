import { activeDecisionPreferences, latestActiveLedgerEvent } from "./ledger";
import type { V3ConversationState } from "./types";

export type UsageQuestionKey = "parkingEquipment" | "familyEquipment" | "longDistanceEquipment" | "workEquipment" | "fuelType" | "bodyStyle" | "budget";

const MATRIX: Readonly<Record<string, readonly UsageQuestionKey[]>> = Object.freeze({
  URBAN_DAILY: ["parkingEquipment", "bodyStyle", "budget", "fuelType"],
  FAMILY: ["familyEquipment", "bodyStyle", "budget", "fuelType"],
  LONG_DISTANCE: ["longDistanceEquipment", "fuelType", "bodyStyle", "budget"],
  COMMERCIAL: ["fuelType", "bodyStyle", "budget", "workEquipment"],
  CORPORATE_TRAVEL: ["fuelType", "bodyStyle", "budget", "workEquipment"],
  MIXED_ROAD: ["bodyStyle", "fuelType", "budget", "parkingEquipment"],
});

export const usageQuestionOrder = (usage: string | undefined): readonly UsageQuestionKey[] => MATRIX[usage ?? ""] ?? ["bodyStyle", "budget", "fuelType", "parkingEquipment"];

export function questionIsResolved(state: V3ConversationState, key: UsageQuestionKey): boolean {
  if (key === "bodyStyle") return Boolean(latestActiveLedgerEvent(state.ledger, "bodyStyle") || latestActiveLedgerEvent(state.ledger, "bodyNotImportant"));
  if (key === "fuelType") return Boolean(latestActiveLedgerEvent(state.ledger, "fuelType") || latestActiveLedgerEvent(state.ledger, "fuelDelegated"));
  if (key === "budget") return Boolean(latestActiveLedgerEvent(state.ledger, "budgetMax") || latestActiveLedgerEvent(state.ledger, "budgetTarget") || latestActiveLedgerEvent(state.ledger, "budgetNotImportant") || latestActiveLedgerEvent(state.ledger, "budgetUnspecified"));
  if (key.endsWith("Equipment")) return Boolean(
    activeDecisionPreferences(state.ledger).some((item) => item.field === "equipmentFeature")
    || latestActiveLedgerEvent(state.ledger, "equipmentNotImportant")
    || latestActiveLedgerEvent(state.ledger, "unmappedEquipmentRequirement"),
  );
  return state.askedQuestionKeys.includes(key);
}

export function usageQuestionText(key: UsageQuestionKey): string {
  switch (key) {
    case "parkingEquipment": return "Şehir içindeki kullanımında hangisi vazgeçilmez: geri görüş kamerası, park sensörleri, otomatik park asistanı; yoksa özel bir park donanımı şart değil mi?";
    case "familyEquipment": return "Aile kullanımında hangisi vazgeçilmez: çocuk koltuğu bağlantısı, geri görüş kamerası, kör nokta uyarısı; yoksa bunlardan hiçbiri şart değil mi?";
    case "longDistanceEquipment": return "Uzun yolda hangisi vazgeçilmez: öndeki araçla mesafeyi koruyan hız sabitleme, kör nokta uyarısı; yoksa özel bir sürüş desteği şart değil mi?";
    case "workEquipment": return "İş akışında hangisi vazgeçilmez: geri görüş kamerası, park sensörleri; yoksa özel bir donanım şart değil mi?";
    case "fuelType": return "Yakıt türünde net bir tercihin var mı, yoksa kullanımına göre birlikte mi değerlendirelim?";
    case "bodyStyle": return "Park kolaylığı mı, daha ferah ve yüksek bir yapı mı senin için daha önemli?";
    case "budget": return "Satın alma için düşündüğün bütçe nedir; kesin bir üst sınırın varsa onu da söyleyebilirsin?";
  }
}
