export type DemoTrustClass = "EXPIYA_VERIFIED" | "DEALER_DECLARED" | "DOCUMENT_UNVERIFIED" | "MISSING";

export interface DemoVehicleFact {
  readonly label: string;
  readonly value: string;
  readonly trustClass: DemoTrustClass;
  readonly source: string;
  readonly checkedAt?: string;
}

export function buildDemoVehicleFacts(car: DemoUsedCar): readonly DemoVehicleFact[] {
  return Object.freeze([
    { label: "Araç kimliği", value: `${car.title} · ${car.trim}`, trustClass: "EXPIYA_VERIFIED", source: "Expiya taxonomy tr-2026.09", checkedAt: "01.09.2026" },
    { label: "Model yılı", value: String(car.year), trustClass: "DEALER_DECLARED", source: "Kurumsal satıcı beyanı", checkedAt: "31.08.2026" },
    { label: "Kilometre", value: `${car.mileageKm.toLocaleString("tr-TR")} km`, trustClass: "DEALER_DECLARED", source: "Kurumsal satıcı beyanı", checkedAt: "31.08.2026" },
    { label: "Bakım geçmişi", value: car.maintenanceDocumented ? "Belge yüklendi" : "Belgeli geçmiş yok", trustClass: car.maintenanceDocumented ? "DOCUMENT_UNVERIFIED" : "MISSING", source: car.maintenanceDocumented ? "Satıcı tarafından yüklenen belgeler" : "—" },
    { label: "Garanti", value: car.warrantyMonths > 0 ? `${car.warrantyMonths} ay satıcı garantisi beyanı` : "Garanti bilgisi yok", trustClass: car.warrantyMonths > 0 ? "DEALER_DECLARED" : "MISSING", source: car.warrantyMonths > 0 ? "Kurumsal satıcı beyanı" : "—" },
    { label: "Ağır hasar kaydı", value: "Beyan: yok", trustClass: "DEALER_DECLARED", source: "Kurumsal satıcı beyanı" },
    { label: "Bağımsız ekspertiz", value: "Bilgi yok", trustClass: "MISSING", source: "—" },
  ]);
}

export const demoTrustLabel: Record<DemoTrustClass, string> = {
  EXPIYA_VERIFIED: "Expiya doğruladı",
  DEALER_DECLARED: "Satıcı beyanı",
  DOCUMENT_UNVERIFIED: "Belge var · içerik doğrulanmadı",
  MISSING: "Eksik bilgi",
};

import type { DemoUsedCar } from "./catalog";
