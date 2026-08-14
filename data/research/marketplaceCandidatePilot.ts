import { buildMarketplaceCandidates, type MarketplaceVehicleObservation } from "@/features/vehicle-data/buildMarketplaceCandidates";

const capturedAt = "2026-08-14";

const otomerkeziObservations: readonly MarketplaceVehicleObservation[] = [
  { brand: "Fiat", model: "Egea", year: 2023, fuel: "GASOLINE", transmission: "MANUAL" },
  { brand: "Kia", model: "Sorento", year: 2007, fuel: "DIESEL", transmission: "AUTOMATIC" },
  { brand: "Fiat", model: "Egea", year: 2020, fuel: "DIESEL", transmission: "AUTOMATIC" },
  { brand: "Kia", model: "Sportage", year: 2015, fuel: "GASOLINE", transmission: "AUTOMATIC" },
  { brand: "Skoda", model: "Karoq", year: 2025, fuel: "GASOLINE", transmission: "AUTOMATIC" },
  { brand: "Volkswagen", model: "T-Roc", year: 2026, fuel: "GASOLINE", transmission: "AUTOMATIC" },
  { brand: "Opel", model: "Combo", year: 2025, fuel: "DIESEL", transmission: "MANUAL" },
  { brand: "Skoda", model: "Superb", year: 2013, fuel: "DIESEL", transmission: "MANUAL" },
  { brand: "Hyundai", model: "i20", year: 2022, fuel: "GASOLINE", transmission: "AUTOMATIC" },
  { brand: "Opel", model: "Combo", year: 2025, fuel: "DIESEL", transmission: "AUTOMATIC" },
  { brand: "Renault", model: "Express", year: 2022, fuel: "DIESEL", transmission: "MANUAL" },
  { brand: "SWM", model: "G01F", year: 2026, fuel: "GASOLINE", transmission: "AUTOMATIC" },
  { brand: "SWM", model: "G01F", year: 2026, fuel: "GASOLINE", transmission: "AUTOMATIC" },
  { brand: "SWM", model: "G01F", year: 2026, fuel: "GASOLINE", transmission: "AUTOMATIC" },
  { brand: "Seat", model: "Ibiza", year: 2021, fuel: "GASOLINE", transmission: "AUTOMATIC" },
];

const otoshopsObservations: readonly MarketplaceVehicleObservation[] = [
  { brand: "BYD", model: "Seal", year: 2025, fuel: "BEV", transmission: "AUTOMATIC", engine: "61.4 kWh 218 HP", trim: "Design" },
  { brand: "Volkswagen", model: "Tiguan", year: 2020, fuel: "GASOLINE", transmission: "AUTOMATIC", engine: "1.5 TSI ACT 150 HP", trim: "Life DSG" },
  { brand: "Kia", model: "Rio", year: 2020, fuel: "GASOLINE", transmission: "AUTOMATIC", engine: "1.4 CVVT 100 HP", trim: "Cool" },
  { brand: "Seat", model: "Leon", year: 2018, fuel: "GASOLINE", transmission: "AUTOMATIC", engine: "1.4 TSI 150 HP", trim: "FR DSG" },
  { brand: "BMW", model: "1 Serisi", year: 2015, fuel: "DIESEL", transmission: "AUTOMATIC", engine: "116d 116 HP", trim: "Joy Plus" },
  { brand: "Nissan", model: "Qashqai", year: 2025, fuel: "GASOLINE", transmission: "AUTOMATIC", engine: "1.3 DIG-T 158 HP", trim: "Design Pack X-Tronic CVT" },
  { brand: "Citroen", model: "Berlingo", year: 2021, fuel: "DIESEL", transmission: "MANUAL", engine: "1.5 BlueHDi 130 HP", trim: "Shine" },
  { brand: "Toyota", model: "Corolla", year: 2025, fuel: "HEV", transmission: "AUTOMATIC", engine: "1.8 Hybrid 140 HP", trim: "Dream e-CVT" },
  { brand: "Toyota", model: "Corolla", year: 2025, fuel: "HEV", transmission: "AUTOMATIC", engine: "1.8 Hybrid 140 HP", trim: "Dream e-CVT" },
  { brand: "Fiat", model: "Egea", year: 2023, fuel: "GASOLINE", transmission: "MANUAL", engine: "1.4 Fire 95 HP", trim: "Easy Plus" },
  { brand: "Opel", model: "Crossland", year: 2022, fuel: "GASOLINE", transmission: "AUTOMATIC", engine: "1.2 Turbo 130 HP", trim: "Essential AT6" },
  { brand: "Opel", model: "Crossland X", year: 2020, fuel: "GASOLINE", transmission: "AUTOMATIC", engine: "1.2 Turbo 130 HP", trim: "Enjoy" },
  { brand: "Toyota", model: "Corolla", year: 2022, fuel: "HEV", transmission: "AUTOMATIC", engine: "1.8 Hybrid 122 HP", trim: "Dream e-CVT" },
  { brand: "Toyota", model: "Corolla", year: 2022, fuel: "HEV", transmission: "AUTOMATIC", engine: "1.8 Hybrid 122 HP", trim: "Dream e-CVT" },
];

export const marketplaceCandidatePilotBatches = [
  {
    sourceId: "otomerkezi", sourceName: "Otomerkezi", sourceUrl: "https://www.otomerkezi.net/ikinci-el",
    robotsUrl: "https://www.otomerkezi.net/robots.txt", capturedAt,
    candidates: buildMarketplaceCandidates(otomerkeziObservations, "https://www.otomerkezi.net/ikinci-el", capturedAt),
  },
  {
    sourceId: "otoshops", sourceName: "Otoshops", sourceUrl: "https://www.otoshops.com/tum-arabalar",
    robotsUrl: "https://www.otoshops.com/robots.txt", capturedAt,
    candidates: buildMarketplaceCandidates(otoshopsObservations, "https://www.otoshops.com/tum-arabalar", capturedAt),
  },
] as const;
