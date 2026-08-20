import type { AuthorizedEquipmentExplanationUnit } from "./equipmentPublicExplanationAuthority.server";

export type PublicEquipmentExplanationItem = Readonly<{ featureCode: string; label: string; explanation: string; caveat: string }>;
export const EQUIPMENT_SESSION_NOTICE = "Bilgiler Türkiye pazarı ve gösterilen model yılına ait resmî donanım listesine dayanır. Donanım ve stok araç konfigürasyonu değişebileceğinden satın alma öncesinde yetkili satıcıdan doğrulayın.";

export function renderPublicEquipmentExplanationItem(unit: AuthorizedEquipmentExplanationUnit): PublicEquipmentExplanationItem {
  return Object.freeze({ featureCode: unit.featureCode, label: unit.labelTr, explanation: unit.controlledExplanation, caveat: unit.caveat });
}

export function publicEquipmentTelemetry(eventType: string, outcome: string, scope: "CURRENT_VEHICLE_SESSION_ONLY") {
  return Object.freeze({ eventType, outcome, scope });
}
