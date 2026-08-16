import type { DataSource } from "@/types/productionVehicle";

// A source being listed does not mean it is publishable. The ingestion gate uses usagePermission.
export const vehicleDataSources: readonly DataSource[] = [
  {
    id: "expiya-internal-estimate", name: "Expiya internal price estimate", authority: "COMMUNITY",
    homepageUrl: "https://www.expiya.com", usagePermission: "INTERNAL_ONLY", reviewedAt: "2026-08-16T22:00:00.000Z",
    reviewNotes: ["Never render estimated amounts to users", "Use only as a temporary decision-filter input", "Official Turkey price observations always supersede estimates"],
  },
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
    id: "byd-tr", name: "BYD Türkiye / ALJ", authority: "PRIMARY",
    homepageUrl: "https://www.bydauto.com.tr/", usagePermission: "PUBLIC_FACTS_ONLY",
    reviewedAt: "2026-08-17T01:00:00.000Z",
    reviewNotes: ["Use Turkey technical brochures and exact dated price-list rows", "Retain battery-capacity wording without inferring usable or gross semantics", "Extract public facts only; do not reproduce copyrighted imagery or brochure prose"],
  },
  {
    id: "chery-tr", name: "Chery Türkiye", authority: "PRIMARY",
    homepageUrl: "https://www.cherytr.com/", termsUrl: "https://www.cherytr.com/kullanim-kosullari/",
    usagePermission: "PUBLIC_FACTS_ONLY", reviewedAt: "2026-08-17T02:00:00.000Z",
    reviewNotes: ["Use the current Turkey model pages and dated price list", "Do not carry discontinued OMODA or PRO MAX configurations into the current catalog without fresh sales evidence", "Extract public facts only; no broad automated crawl or copyrighted asset reuse"],
  },
  {
    id: "citroen-tr", name: "Citroën Türkiye / Tofaş", authority: "PRIMARY",
    homepageUrl: "https://www.citroen.com.tr/", termsUrl: "https://www.citroen.com.tr/kullanim-kosullari.html",
    usagePermission: "PUBLIC_FACTS_ONLY", reviewedAt: "2026-08-17T03:00:00.000Z",
    reviewNotes: ["Use exact Turkey digital catalogs and dated Tofaş price-list rows", "Passenger and commercial configurations require separate collection batches", "Extract public facts only; do not reproduce copyrighted imagery or brochure prose"],
  },
  {
    id: "cupra-tr", name: "CUPRA Türkiye / Doğuş Otomotiv", authority: "PRIMARY",
    homepageUrl: "https://www.cupraofficial.com.tr/", termsUrl: "https://www.cupraofficial.com.tr/genel/kullanim-sartlari-ve-gizlilik-politikasi",
    usagePermission: "PUBLIC_FACTS_ONLY", reviewedAt: "2026-08-17T05:00:00.000Z",
    reviewNotes: ["Use current Turkey model pages, official catalogs and dated price-list rows", "Keep official range or power conflicts as provenance limitations", "Extract public facts only; do not reproduce copyrighted imagery or brochure prose"],
  },
  { id:"dacia-tr",name:"Dacia Türkiye / Renault MAİS",authority:"PRIMARY",homepageUrl:"https://www.dacia.com.tr/",termsUrl:"https://www.dacia.com.tr/yasal-bilgiler.html",usagePermission:"PUBLIC_FACTS_ONLY",reviewedAt:"2026-08-17T06:00:00.000Z",reviewNotes:["Use current configurator and dated price pages","Do not infer unavailable trim combinations","Public facts only"] },
  { id:"dfsk-tr",name:"DFSK Türkiye",authority:"PRIMARY",homepageUrl:"https://www.dfsk-tr.com/",usagePermission:"PUBLIC_FACTS_ONLY",reviewedAt:"2026-08-17T07:00:00.000Z",reviewNotes:["E5 passenger PHEV only in this batch","Commercial C-Series deferred","Public facts only"] },
  { id:"ds-tr",name:"DS Automobiles Türkiye / Tofaş",authority:"PRIMARY",homepageUrl:"https://www.dsautomobiles.com.tr/",usagePermission:"PUBLIC_FACTS_ONLY",reviewedAt:"2026-08-17T08:00:00.000Z",reviewNotes:["Use current Turkey model pages and dated price list","Public facts only"] },
  { id:"ferrari-tr",name:"Ferrari Türkiye / FerMas",authority:"PRIMARY",homepageUrl:"https://www.ferrari.com/tr-TR/",usagePermission:"PUBLIC_FACTS_ONLY",reviewedAt:"2026-08-17T09:00:00.000Z",reviewNotes:["Turkey public list prices are unavailable","All bootstrap prices remain internal-only estimates","Special-series allocation does not imply open stock"] },
  { id:"fiat-tr",name:"Fiat Türkiye / Tofaş",authority:"PRIMARY",homepageUrl:"https://www.fiat.com.tr/",usagePermission:"PUBLIC_FACTS_ONLY",reviewedAt:"2026-08-17T10:00:00.000Z",reviewNotes:["Passenger and passenger-combi configurations only","Cargo and heavy commercial variants deferred","Public facts only"] },
  { id:"ford-tr",name:"Ford Türkiye / Ford Otosan",authority:"PRIMARY",homepageUrl:"https://www.ford.com.tr/",usagePermission:"PUBLIC_FACTS_ONLY",reviewedAt:"2026-08-17T11:00:00.000Z",reviewNotes:["Passenger and Tourneo passenger configurations only","Transit and panel-van variants deferred","Public facts only"] },
  { id:"honda-tr",name:"Honda Türkiye",authority:"PRIMARY",homepageUrl:"https://www.honda.com.tr/otomobil",usagePermission:"PUBLIC_FACTS_ONLY",reviewedAt:"2026-08-17T12:00:00.000Z",reviewNotes:["Use 2026 model-year price list and exact model pages","Public facts only"] },
  {
    id: "alfa-romeo-tr", name: "Alfa Romeo Türkiye / Tofaş", authority: "PRIMARY",
    homepageUrl: "https://www.alfaromeo.com.tr/", termsUrl: "https://www.alfaromeo.com.tr/kullanim-kosullari",
    usagePermission: "PUBLIC_FACTS_ONLY", reviewedAt: "2026-08-16T00:00:00.000Z",
    reviewNotes: ["Use exact MY2026 Tofaş price-circular rows and Turkey model pages", "Extract public facts only; do not reproduce copyrighted imagery or prose", "Publisher CDN blocks direct PDF retrieval in some automated environments; record this limitation rather than bypassing it"],
  },
  {
    id: "alpine-tr", name: "Alpine Türkiye / Renault Group", authority: "PRIMARY",
    homepageUrl: "https://www.alpinecars.com.tr/", termsUrl: "https://www.alpinecars.com.tr/yasal-bilgiler.html",
    usagePermission: "PUBLIC_FACTS_ONLY", reviewedAt: "2026-08-16T00:00:00.000Z",
    reviewNotes: ["Use exact Turkey configurator prices and configuration pages", "Retain homologation-document conflicts instead of silently merging them", "Extract public facts only; do not reproduce copyrighted imagery or prose"],
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
