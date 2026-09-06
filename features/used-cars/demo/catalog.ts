export type DemoRiskLevel = "LOW" | "BALANCED" | "FLEXIBLE";

export interface DemoUsedCar {
  readonly id: string;
  readonly title: string;
  readonly trim: string;
  readonly year: number;
  readonly mileageKm: number;
  readonly priceTry: number;
  readonly bodyStyle: "SUV" | "HATCHBACK" | "SEDAN";
  readonly fuelType: "HYBRID" | "GASOLINE" | "DIESEL";
  readonly seller: string;
  readonly city: string;
  readonly evidence: "STRONG" | "PARTIAL" | "LIMITED";
  readonly risk: DemoRiskLevel;
  readonly maintenanceDocumented: boolean;
  readonly warrantyMonths: number;
  readonly accent: string;
  readonly uncertainties: readonly string[];
}

export const DEMO_USED_CARS: readonly DemoUsedCar[] = Object.freeze([
  {
    id: "demo-ankara-suv-01", title: "Toyota C-HR", trim: "1.8 Hybrid Passion", year: 2021,
    mileageKm: 48_200, priceTry: 1_575_000, bodyStyle: "SUV", fuelType: "HYBRID",
    seller: "Demo Ankara Otomotiv", city: "Ankara", evidence: "STRONG", risk: "LOW",
    maintenanceDocumented: true, warrantyMonths: 6, accent: "from-emerald-950 via-emerald-800 to-lime-700",
    uncertainties: ["Boya ölçüm belgesi bağımsız olarak doğrulanmadı."],
  },
  {
    id: "demo-istanbul-hatch-02", title: "Renault Clio", trim: "1.0 TCe Icon", year: 2022,
    mileageKm: 61_400, priceTry: 1_080_000, bodyStyle: "HATCHBACK", fuelType: "GASOLINE",
    seller: "Demo Marmara Mobilite", city: "İstanbul", evidence: "PARTIAL", risk: "BALANCED",
    maintenanceDocumented: true, warrantyMonths: 0, accent: "from-slate-900 via-slate-700 to-sky-700",
    uncertainties: ["Garanti bulunmuyor.", "Ekspertiz belgesi yüklendi; içeriği doğrulanmadı."],
  },
  {
    id: "demo-izmir-sedan-03", title: "Fiat Egea", trim: "1.6 Multijet Urban", year: 2020,
    mileageKm: 92_700, priceTry: 995_000, bodyStyle: "SEDAN", fuelType: "DIESEL",
    seller: "Demo Ege Filo Satış", city: "İzmir", evidence: "LIMITED", risk: "FLEXIBLE",
    maintenanceDocumented: false, warrantyMonths: 0, accent: "from-stone-900 via-amber-900 to-orange-700",
    uncertainties: ["Bakım geçmişi belgeli değil.", "Değişen parça beyanı doğrulanamadı."],
  },
]);

export const formatTry = (value: number) => new Intl.NumberFormat("tr-TR", {
  style: "currency", currency: "TRY", maximumFractionDigits: 0,
}).format(value);

export const findDemoUsedCar = (id: string) => DEMO_USED_CARS.find(car => car.id === id);
