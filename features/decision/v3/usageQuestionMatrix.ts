import { latestActiveLedgerEvent } from "./ledger";
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
  if (state.askedQuestionKeys.includes(key)) return true;
  if (key === "bodyStyle") return Boolean(latestActiveLedgerEvent(state.ledger, "bodyStyle") || latestActiveLedgerEvent(state.ledger, "bodyNotImportant"));
  if (key === "fuelType") return Boolean(latestActiveLedgerEvent(state.ledger, "fuelType"));
  if (key === "budget") return Boolean(latestActiveLedgerEvent(state.ledger, "budgetMax") || latestActiveLedgerEvent(state.ledger, "budgetTarget") || latestActiveLedgerEvent(state.ledger, "budgetNotImportant") || latestActiveLedgerEvent(state.ledger, "budgetUnspecified"));
  if (key.endsWith("Equipment")) return Boolean(latestActiveLedgerEvent(state.ledger, "equipmentFeature"));
  return false;
}

export function usageQuestionText(key: UsageQuestionKey): string {
  switch (key) {
    case "parkingEquipment": return "Dar yerlerde manevrayı kolaylaştıran bir özellik senin için belirleyici mi; örneğin geri görüş kamerası, park sensörleri veya aracın park etmesine yardım eden bir sistem?";
    case "familyEquipment": return "Aile kullanımında vazgeçmek istemeyeceğin bir kolaylık var mı; örneğin çocuk koltuğu bağlantısı, geri görüş kamerası veya kör nokta uyarısı?";
    case "longDistanceEquipment": return "Uzun yolda özellikle aradığın bir sürüş desteği var mı; örneğin öndeki araçla mesafeyi koruyan hız sabitleme veya kör nokta uyarısı?";
    case "workEquipment": return "İş akışında vazgeçilmez gördüğün bir donanım var mı; örneğin geri görüş kamerası ya da park sensörleri?";
    case "fuelType": return "Yakıt türünde net bir tercihin var mı, yoksa kullanımına göre birlikte mi değerlendirelim?";
    case "bodyStyle": return "Park kolaylığı mı, daha ferah ve yüksek bir yapı mı senin için daha önemli?";
    case "budget": return "Satın alma için düşündüğün bütçe nedir; kesin bir üst sınırın varsa onu da söyleyebilirsin?";
  }
}
