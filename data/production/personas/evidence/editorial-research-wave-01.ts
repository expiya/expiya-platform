import type { VehiclePersonaTrait } from "@/types/vehiclePersona";

export interface EditorialResearchSource {
  url: string;
  publisher: string;
  title: string;
  sourceType: "EDITORIAL_REVIEW" | "EDITORIAL_VIDEO";
  publicationDate: string;
  market: string;
  modelYearOrGeneration: string;
  locator: string;
}

export interface EditorialResearchClaim {
  trait: VehiclePersonaTrait;
  neutralSummary: string;
  sourceIndexes: readonly [number, number, ...number[]];
}

export interface EditorialResearchFamily {
  canonicalBrand: string;
  canonicalModel: string;
  generationMatchBasis: string;
  sources: readonly EditorialResearchSource[];
  claims: readonly EditorialResearchClaim[];
}

export const EDITORIAL_RESEARCH_WAVE_01: readonly EditorialResearchFamily[] = [
  {
    canonicalBrand: "Renault", canonicalModel: "Clio", generationMatchBasis: "Auto Express current-model review plus Top Gear 2019–2025 fifth-generation review; sixth-generation 2027 content excluded.",
    sources: [
      { url: "https://www.autoexpress.co.uk/renault/clio", publisher: "Auto Express", title: "Renault Clio review", sourceType: "EDITORIAL_REVIEW", publicationDate: "2026-03-18", market: "UK", modelYearOrGeneration: "current fifth-generation / 2026 review", locator: "Driving and comfort; Practicality sections" },
      { url: "https://www.topgear.com/car-reviews/renault/clio-2019-2025/driving", publisher: "Top Gear", title: "Renault Clio (2019-2025) driving review", sourceType: "EDITORIAL_REVIEW", publicationDate: "2024-07-04", market: "UK", modelYearOrGeneration: "fifth generation (2019-2025)", locator: "Driving: ride, refinement and chassis sections" },
    ],
    claims: [
      { trait: "COMFORT", neutralSummary: "İki editoryal inceleme sürüş konforu ve rafineliği Clio karakterinin tekrarlanan bir yönü olarak değerlendiriyor.", sourceIndexes: [0, 1] },
      { trait: "DRIVING_ENGAGEMENT", neutralSummary: "Direksiyon tepkisi ve dengeli şasi, iki incelemede nötr sürüş katılımı sinyali veriyor.", sourceIndexes: [0, 1] },
    ],
  },
  {
    canonicalBrand: "Dacia", canonicalModel: "Sandero", generationMatchBasis: "Both sources cover the third-generation Sandero sold during the active catalog period.",
    sources: [
      { url: "https://www.autoexpress.co.uk/dacia/sandero/355845/dacia-sandero-review", publisher: "Auto Express", title: "Dacia Sandero review", sourceType: "EDITORIAL_REVIEW", publicationDate: "2026-02-03", market: "UK", modelYearOrGeneration: "third generation, current 2026 review", locator: "Overview; Practicality; Ride comfort sections" },
      { url: "https://www.topgear.com/long-term-car-reviews/dacia/sandero/report-6/", publisher: "Top Gear", title: "Dacia Sandero long-term review: practicality report", sourceType: "EDITORIAL_REVIEW", publicationDate: "2024-01-08", market: "UK", modelYearOrGeneration: "third generation", locator: "Report 6: cabin and luggage-space observations" },
    ],
    claims: [
      { trait: "PRACTICALITY", neutralSummary: "Kabindeki kullanılabilir alan ve bagaj işlevselliği iki bağımsız incelemede ortak pratiklik sinyali oluşturuyor.", sourceIndexes: [0, 1] },
      { trait: "VALUE", neutralSummary: "Sade ve erişilebilir ulaşım odağı iki incelemenin ortak değer karakteri olarak öne çıkıyor.", sourceIndexes: [0, 1] },
    ],
  },
  {
    canonicalBrand: "Dacia", canonicalModel: "Sandero Stepway", generationMatchBasis: "Both sources cover the current third-generation Stepway.",
    sources: [
      { url: "https://www.autoexpress.co.uk/dacia/sandero/355718/dacia-sandero-stepway-review", publisher: "Auto Express", title: "Dacia Sandero Stepway review", sourceType: "EDITORIAL_REVIEW", publicationDate: "2026-02-03", market: "UK", modelYearOrGeneration: "third generation, current 2026 review", locator: "Overview; Comfort and practicality sections" },
      { url: "https://www.topgear.com/car-reviews/dacia/sandero-stepway-hatchback-2021/10-tce-bi-fuel-comfort-5dr/first-drive", publisher: "Top Gear", title: "Dacia Sandero Stepway review: 1.0-litre Bi-Fuel tested", sourceType: "EDITORIAL_REVIEW", publicationDate: "2021-02-24", market: "UK", modelYearOrGeneration: "third generation", locator: "First drive: value, cockpit usability and rugged crossover design" },
    ],
    claims: [
      { trait: "PRACTICALITY", neutralSummary: "Kabin alanı ve günlük kullanım kolaylığı iki incelemede tekrarlanan pratiklik sinyali veriyor.", sourceIndexes: [0, 1] },
      { trait: "ADVENTURE", neutralSummary: "Yükseltilmiş, dayanıklı görsel karakter iki incelemede hafif macera çağrışımı olarak tanımlanıyor; arazi kabiliyeti iddiası üretilmiyor.", sourceIndexes: [0, 1] },
      { trait: "VALUE", neutralSummary: "Erişilebilirlik ve sade kullanım odağı iki bağımsız incelemede ortak değer karakteri oluşturuyor.", sourceIndexes: [0, 1] },
    ],
  },
  {
    canonicalBrand: "Dacia", canonicalModel: "Jogger", generationMatchBasis: "Written and video sources cover the sole first-generation Jogger architecture; equipment assertions excluded.",
    sources: [
      { url: "https://www.topgear.com/car-reviews/dacia/jogger", publisher: "Top Gear", title: "Dacia Jogger review", sourceType: "EDITORIAL_REVIEW", publicationDate: "2026-04-24", market: "UK", modelYearOrGeneration: "first generation, current 2026 review", locator: "Overview; Interior and practicality sections" },
      { url: "https://www.youtube.com/watch?v=xIlpu-JEkL4", publisher: "carwow", title: "Dacia Jogger review - one of the best cars in the world!", sourceType: "EDITORIAL_VIDEO", publicationDate: "2022-05-05", market: "UK", modelYearOrGeneration: "first generation", locator: "00:36–01:36 exterior; 01:37–03:42 interior; 03:43–07:31 rear seats and boot; 11:13–14:00 driving; 15:05–end verdict" },
    ],
    claims: [
      { trait: "PRACTICALITY", neutralSummary: "Yazılı inceleme ile video testinin 03:43–07:31 bölümü, çok amaçlı kabin ve yük kullanımını ortak karakter olarak destekliyor.", sourceIndexes: [0, 1] },
      { trait: "FAMILY", neutralSummary: "Çok koltuklu yaşam alanı odağı iki editoryal kaynakta aile kullanımına dönük nötr sinyal oluşturuyor.", sourceIndexes: [0, 1] },
      { trait: "VALUE", neutralSummary: "İki kaynak da yalın, maliyet bilinci yüksek çok amaçlı araç yaklaşımını ortak karakter olarak değerlendiriyor.", sourceIndexes: [0, 1] },
    ],
  },
  {
    canonicalBrand: "Volkswagen", canonicalModel: "Golf", generationMatchBasis: "Both reviews cover the facelifted eighth-generation Golf (Mk8.5).",
    sources: [
      { url: "https://www.autoexpress.co.uk/volkswagen/golf", publisher: "Auto Express", title: "Volkswagen Golf review", sourceType: "EDITORIAL_REVIEW", publicationDate: "2026-07-07", market: "UK", modelYearOrGeneration: "Mk8.5 facelift", locator: "Ride and handling; Interior; Practicality sections" },
      { url: "https://www.topgear.com/car-reviews/volkswagen/golf", publisher: "Top Gear", title: "Volkswagen Golf review", sourceType: "EDITORIAL_REVIEW", publicationDate: "2024-07-24", market: "UK", modelYearOrGeneration: "Mk8.5 facelift", locator: "Overview; Driving; Interior sections" },
    ],
    claims: [
      { trait: "COMFORT", neutralSummary: "Sürüş rafineliği ve dengeli günlük kullanım iki Mk8.5 incelemesinde ortak karakter sinyali veriyor.", sourceIndexes: [0, 1] },
      { trait: "PRACTICALITY", neutralSummary: "Günlük kabin ve yük kullanılabilirliği iki incelemede ortak pratiklik özelliği olarak değerlendiriliyor.", sourceIndexes: [0, 1] },
      { trait: "TECHNOLOGY", neutralSummary: "Yenilenen dijital arayüz ve kokpit deneyimi iki incelemede model karakterinin belirgin parçası olarak ele alınıyor; donanım varlığı iddiası değildir.", sourceIndexes: [0, 1] },
    ],
  },
  {
    canonicalBrand: "Volkswagen", canonicalModel: "Tiguan", generationMatchBasis: "Both sources explicitly cover the third-generation Tiguan.",
    sources: [
      { url: "https://www.topgear.com/car-reviews/volkswagen/tiguan", publisher: "Top Gear", title: "Volkswagen Tiguan review", sourceType: "EDITORIAL_REVIEW", publicationDate: "2025-02-28", market: "UK", modelYearOrGeneration: "third generation", locator: "Overview; Driving; Interior sections" },
      { url: "https://www.autoexpress.co.uk/volkswagen/tiguan/practicality", publisher: "Auto Express", title: "Volkswagen Tiguan practicality, comfort and boot space", sourceType: "EDITORIAL_REVIEW", publicationDate: "2025-02-24", market: "UK", modelYearOrGeneration: "third generation", locator: "Practicality, comfort and boot-space sections" },
    ],
    claims: [
      { trait: "COMFORT", neutralSummary: "Konfor ve rafinelik odağı üçüncü nesil için iki incelemede ortak karakter sinyali oluşturuyor.", sourceIndexes: [0, 1] },
      { trait: "PRACTICALITY", neutralSummary: "Kabin esnekliği ve günlük kullanılabilirlik iki incelemede ortak pratiklik sinyali veriyor.", sourceIndexes: [0, 1] },
    ],
  },
  {
    canonicalBrand: "Volkswagen", canonicalModel: "Passat", generationMatchBasis: "Both sources cover the current B9 estate-only generation.",
    sources: [
      { url: "https://www.topgear.com/car-reviews/volkswagen/passat", publisher: "Top Gear", title: "Volkswagen Passat review", sourceType: "EDITORIAL_REVIEW", publicationDate: "2025-07-31", market: "UK", modelYearOrGeneration: "B9 generation", locator: "Overview; Driving; Interior sections" },
      { url: "https://www.autoexpress.co.uk/volkswagen/passat", publisher: "Auto Express", title: "Volkswagen Passat review", sourceType: "EDITORIAL_REVIEW", publicationDate: "2026-02-02", market: "UK", modelYearOrGeneration: "B9 generation", locator: "Ride and handling; Practicality sections" },
    ],
    claims: [
      { trait: "COMFORT", neutralSummary: "Uzun yol rafineliği ve konfor odağı iki B9 incelemesinde ortak karakter olarak destekleniyor.", sourceIndexes: [0, 1] },
      { trait: "PRACTICALITY", neutralSummary: "Geniş yaşam ve yük alanı iki incelemede ortak pratiklik sinyali oluşturuyor.", sourceIndexes: [0, 1] },
    ],
  },
  {
    canonicalBrand: "Volkswagen", canonicalModel: "Polo", generationMatchBasis: "Both sources cover the facelifted sixth-generation Polo.",
    sources: [
      { url: "https://www.topgear.com/car-reviews/volkswagen/polo", publisher: "Top Gear", title: "Volkswagen Polo review", sourceType: "EDITORIAL_REVIEW", publicationDate: "2024-08-07", market: "UK", modelYearOrGeneration: "sixth generation facelift", locator: "Overview; Driving sections" },
      { url: "https://www.autoexpress.co.uk/volkswagen/polo/interior", publisher: "Auto Express", title: "Volkswagen Polo interior, dashboard and comfort", sourceType: "EDITORIAL_REVIEW", publicationDate: "2025-05-21", market: "UK", modelYearOrGeneration: "sixth generation facelift", locator: "Interior, dashboard and comfort sections" },
    ],
    claims: [
      { trait: "COMFORT", neutralSummary: "Rafinelik ve konfor, iki güncel nesil incelemesinde ortak karakter sinyali veriyor.", sourceIndexes: [0, 1] },
      { trait: "URBAN", neutralSummary: "Kompakt ölçekte kolay kullanım ve şehir içi uyum iki incelemede ortak nötr kullanım karakteri oluşturuyor.", sourceIndexes: [0, 1] },
    ],
  },
  {
    canonicalBrand: "Škoda", canonicalModel: "Octavia", generationMatchBasis: "Both sources cover the facelifted fourth-generation Octavia.",
    sources: [
      { url: "https://www.autoexpress.co.uk/skoda/octavia", publisher: "Auto Express", title: "Skoda Octavia review", sourceType: "EDITORIAL_REVIEW", publicationDate: "2025-11-12", market: "UK", modelYearOrGeneration: "fourth generation facelift", locator: "Overview; Ride and handling; Practicality sections" },
      { url: "https://www.topgear.com/car-reviews/skoda/octavia", publisher: "Top Gear", title: "Skoda Octavia review", sourceType: "EDITORIAL_REVIEW", publicationDate: "2024-10-31", market: "UK", modelYearOrGeneration: "fourth generation facelift", locator: "Overview; Driving; Interior sections" },
    ],
    claims: [
      { trait: "COMFORT", neutralSummary: "Yumuşak sürüş yaklaşımı ve rafinelik iki makyajlı dördüncü nesil incelemesinde ortak sinyal veriyor.", sourceIndexes: [0, 1] },
      { trait: "PRACTICALITY", neutralSummary: "Yaşam ve yük alanı kullanışlılığı iki incelemede güçlü ortak karakter sinyali oluşturuyor.", sourceIndexes: [0, 1] },
      { trait: "VALUE", neutralSummary: "Kullanılabilirlik ile maliyet dengesi iki incelemede modelin nötr değer karakteri olarak destekleniyor.", sourceIndexes: [0, 1] },
    ],
  },
  {
    canonicalBrand: "Škoda", canonicalModel: "Fabia", generationMatchBasis: "Both sources explicitly cover the fourth-generation Fabia.",
    sources: [
      { url: "https://www.autoexpress.co.uk/depth-reviews/356422/skoda-fabia-review", publisher: "Auto Express", title: "Skoda Fabia review", sourceType: "EDITORIAL_REVIEW", publicationDate: "2026-06-03", market: "UK", modelYearOrGeneration: "fourth generation", locator: "Overview; Comfort; Practicality sections" },
      { url: "https://www.topgear.com/car-reviews/skoda/fabia", publisher: "Top Gear", title: "Skoda Fabia review", sourceType: "EDITORIAL_REVIEW", publicationDate: "2026-02-05", market: "UK", modelYearOrGeneration: "fourth generation", locator: "Overview; Driving; Interior sections" },
    ],
    claims: [
      { trait: "COMFORT", neutralSummary: "Konfor odaklı günlük sürüş iki dördüncü nesil incelemesinde ortak karakter sinyali veriyor.", sourceIndexes: [0, 1] },
      { trait: "PRACTICALITY", neutralSummary: "Sınıfına göre yaşam alanı ve kullanılabilirlik iki incelemede ortak pratiklik sinyali oluşturuyor.", sourceIndexes: [0, 1] },
      { trait: "URBAN", neutralSummary: "Kompakt ölçekte kolay kullanım iki incelemede şehir uyumlu nötr karakter olarak destekleniyor.", sourceIndexes: [0, 1] },
    ],
  },
  {
    canonicalBrand: "Škoda", canonicalModel: "Kodiaq", generationMatchBasis: "Both sources cover the second-generation Kodiaq.",
    sources: [
      { url: "https://www.topgear.com/car-reviews/skoda/kodiaq", publisher: "Top Gear", title: "Skoda Kodiaq review", sourceType: "EDITORIAL_REVIEW", publicationDate: "2025-05-19", market: "UK", modelYearOrGeneration: "second generation", locator: "Overview; Driving; Interior sections" },
      { url: "https://www.autoexpress.co.uk/skoda/kodiaq", publisher: "Auto Express", title: "Skoda Kodiaq review", sourceType: "EDITORIAL_REVIEW", publicationDate: "2026-08-03", market: "UK", modelYearOrGeneration: "second generation", locator: "Comfort; Interior and practicality sections" },
    ],
    claims: [
      { trait: "COMFORT", neutralSummary: "Konfor öncelikli sürüş ayarı iki ikinci nesil incelemesinde ortak karakter sinyali veriyor.", sourceIndexes: [0, 1] },
      { trait: "PRACTICALITY", neutralSummary: "Esnek ve geniş kabin kullanımı iki incelemede ortak pratiklik sinyali oluşturuyor.", sourceIndexes: [0, 1] },
      { trait: "FAMILY", neutralSummary: "Çok amaçlı geniş yaşam alanı iki incelemede aile kullanımına dönük nötr karakter olarak destekleniyor.", sourceIndexes: [0, 1] },
    ],
  },
] as const;
