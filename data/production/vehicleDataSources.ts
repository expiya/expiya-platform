import type { DataSource } from "@/types/productionVehicle";

// A source being listed does not mean it is publishable. The ingestion gate uses usagePermission.
export const vehicleDataSources: readonly DataSource[] = [
  {
    id: "toyota-tr", name: "Toyota Türkiye", authority: "PRIMARY",
    homepageUrl: "https://www.toyota.com.tr/", robotsUrl: "https://www.toyota.com.tr/robots.txt",
    usagePermission: "PUBLIC_FACTS_ONLY", reviewedAt: "2026-08-13T00:00:00.000Z",
    reviewNotes: ["Use dated TR PDFs or manual capture with citation", "Do not reuse copyrighted images or brochure text", "No broad automated crawl"],
  },
  {
    id: "hyundai-tr", name: "Hyundai Motor Türkiye", authority: "PRIMARY",
    homepageUrl: "https://www.hyundai.com/tr/tr/", usagePermission: "PUBLIC_FACTS_ONLY",
    reviewedAt: "2026-08-13T00:00:00.000Z",
    reviewNotes: ["Dated prices and campaign validity are required", "Automation requires a separate permission review"],
  },
  {
    id: "renault-tr", name: "Renault Türkiye", authority: "PRIMARY",
    homepageUrl: "https://www.renault.com.tr/", robotsUrl: "https://www.renault.com.tr/robots.txt",
    termsUrl: "https://www.renault.com.tr/yasal-bilgi.html", usagePermission: "PUBLIC_FACTS_ONLY",
    reviewedAt: "2026-08-14T00:00:00.000Z",
    reviewNotes: ["Use dated price lists and exact Turkey trim pages", "Manual fact capture only; no broad automated crawl", "Do not reproduce copyrighted images or brochure text"],
  },
  {
    id: "opel-tr", name: "Opel Türkiye", authority: "PRIMARY",
    homepageUrl: "https://www.opel.com.tr/", usagePermission: "PUBLIC_FACTS_ONLY",
    reviewedAt: "2026-08-14T20:00:00.000Z",
    reviewNotes: ["Use exact MY26 price-list rows and Turkey equipment pages", "Manual public-fact capture only"],
  },
  {
    id: "bmw-tr", name: "BMW Türkiye / Borusan Otomotiv", authority: "PRIMARY",
    homepageUrl: "https://www.bmw.com.tr/", usagePermission: "PUBLIC_FACTS_ONLY",
    reviewedAt: "2026-08-14T20:00:00.000Z",
    reviewNotes: ["Use current distributor price-list rows and exact Turkey model pages", "Manual public-fact capture only"],
  },
  {
    id: "euro-ncap", name: "Euro NCAP", authority: "OFFICIAL",
    homepageUrl: "https://www.euroncap.com/", termsUrl: "https://www.euroncap.com/terms-conditions/",
    usagePermission: "PERMISSION_REQUIRED", reviewedAt: "2026-08-13T00:00:00.000Z",
    reviewNotes: ["Terms prohibit commercial reproduction without prior permission", "Rating applicability must match TR safety equipment and test year"],
  },
  {
    id: "nhtsa", name: "NHTSA", authority: "OFFICIAL",
    homepageUrl: "https://www.nhtsa.gov/nhtsa-datasets-and-apis", usagePermission: "OPEN_LICENSE",
    license: "US federal public data; verify per-dataset notice", reviewedAt: "2026-08-13T00:00:00.000Z",
    reviewNotes: ["US-market evidence only", "Complaint counts require an exposure denominator before scoring"],
  },
  {
    id: "eu-safety-gate", name: "EU Safety Gate", authority: "OFFICIAL",
    homepageUrl: "https://ec.europa.eu/safety-gate-alerts/", termsUrl: "https://commission.europa.eu/legal-notice_en",
    usagePermission: "OPEN_LICENSE", license: "CC BY 4.0 unless otherwise indicated",
    reviewedAt: "2026-08-13T00:00:00.000Z", reviewNotes: ["Attribute EU source and mark transformations", "Exclude third-party protected material"],
  },
  {
    id: "tuik", name: "TÜİK", authority: "OFFICIAL",
    homepageUrl: "https://www.tuik.gov.tr/", termsUrl: "https://www.tuik.gov.tr/Kurumsal/Yasal_Uyari",
    usagePermission: "OPEN_LICENSE", license: "Reuse permitted with attribution",
    reviewedAt: "2026-08-13T00:00:00.000Z", reviewNotes: ["Use aggregate market denominators", "Cite TÜİK"],
  },
  {
    id: "tsb-kasko", name: "Türkiye Sigorta Birliği Kasko Değer Listesi", authority: "OFFICIAL",
    homepageUrl: "https://www.tsb.org.tr/tr/kasko-arsiv-listesi", usagePermission: "PERMISSION_REQUIRED",
    reviewedAt: "2026-08-13T00:00:00.000Z", reviewNotes: ["Public lookup is not an API licence", "Member web service uses credentials", "Values omit mileage and condition detail"],
  },
  {
    id: "indicata-tr", name: "Indicata Türkiye", authority: "LICENSED",
    homepageUrl: "https://indicata.com.tr/", usagePermission: "CONTRACT_REQUIRED",
    reviewedAt: "2026-08-13T00:00:00.000Z", reviewNotes: ["Commercial API/CSV offering", "Territory, retention, display and derived-data rights must be contracted"],
  },
  {
    id: "arabam", name: "Arabam.com", authority: "COMMUNITY",
    homepageUrl: "https://www.arabam.com/", robotsUrl: "https://www.arabam.com/robots.txt",
    usagePermission: "PROHIBITED", reviewedAt: "2026-08-13T00:00:00.000Z",
    reviewNotes: ["Search/filter paths disallowed in robots review", "No scraping; require a contractual feed"],
  },
];

export const vehicleDataSourceById: ReadonlyMap<string, DataSource> = new Map(
  vehicleDataSources.map((source) => [source.id, source]),
);
