import type { StrollerProduct } from "./contracts";

export const STROLLER_CATALOG_RELEASE = "BABY-STROLLER-TR-v0.1-candidate" as const;
export const STROLLER_SOURCES = Object.freeze([
  { id: "CYBEX-TR-BALIOS", url: "https://www.cybex-online.com/en/row/strollers/", authority: "MANUFACTURER_REGIONAL_PRODUCT_INDEX", trApplicability: true },
  { id: "CYBEX-BALIOS-PRODUCT", url: "https://www.cybex-online.com/en/gb/p/st-go-balios-s-lux.html", authority: "MANUFACTURER_PRODUCT_PAGE", trApplicability: false },
  { id: "CYBEX-BALIOS-MANUAL", url: "https://www.cybex-online.com/on/demandware.static/-/Sites-cybex-master-catalog/default/dwfbcd95b9/pdfs/manuals/ST_GO_Balios_S_Lux_EN/CY_171_8888_B0424_Balios_S_Lux_Illustration_Booklet_DIGITAL_EN.pdf", authority: "MANUFACTURER_MANUAL_WITH_TR", trApplicability: true },
  { id: "JOIE-PACT-MANUAL", url: "https://dl.joiebaby.com/Instruction_Manual/GL/Pact-Travel-System/Joie-pushchair-pact-instruction-manual.pdf", authority: "MANUFACTURER_MANUAL_WITH_TR", trApplicability: true },
  { id: "JOIE-TOURIST-MANUAL", url: "https://dl.joiebaby.com/Instruction_Manual/GL/Tourist/Joie-pushchair-tourist-instruction-manual.pdf", authority: "MANUFACTURER_MANUAL_WITH_TR", trApplicability: true },
] as const);

const unknownFacts = { childWeightMaxKg: "UNKNOWN", newbornUse: "UNKNOWN", strollerWeightKg: "UNKNOWN", foldedMm: "UNKNOWN", oneHandFold: "UNKNOWN", selfStanding: "UNKNOWN", reversibleSeat: "UNKNOWN", lieFlatRecline: "UNKNOWN", suspension: "UNKNOWN", basketMaxKg: "UNKNOWN", cabinSizeClaim: "UNKNOWN", travelSystemCompatible: "UNKNOWN" } as const;

export const STROLLER_PRODUCTS: readonly StrollerProduct[] = Object.freeze([
  { exactProductId: "CYBEX_BALIOS_S_LUX_520001251_TR", manufacturer: "CYBEX", model: "Balios S Lux 520001251", configurationIdentity: "CYBEX Balios S Lux / 520001251 / Navy Blue, Silver Frame / Türkiye", type: ["STANDARD", "TRAVEL_SYSTEM_COMPATIBLE"], trApplicability: { status: "VERIFIED", evidenceIds: ["CYBEX-TR-BALIOS", "CYBEX-BALIOS-MANUAL"] }, facts: { ...unknownFacts, childWeightMaxKg: 22, newbornUse: "SEAT_LIE_FLAT", strollerWeightKg: 11.7, foldedMm: [430, 600, 755], oneHandFold: true, selfStanding: true, lieFlatRecline: true, suspension: "ALL_WHEEL", basketMaxKg: 5, travelSystemCompatible: true }, included: ["şasi ve tekerlekler", "oturma ünitesi", "alışveriş sepeti", "ön bar", "güneşlik", "yağmurluk", "kullanım kılavuzu"], separatelySold: ["Cot S", "Cocoon S", "CYBEX Gold bebek oto koltuğu", "Balios S Line adaptörü"], evidenceIds: ["CYBEX-BALIOS-PRODUCT", "CYBEX-BALIOS-MANUAL"] },
  { exactProductId: "JOIE_PACT_TR", manufacturer: "Joie", model: "Pact", configurationIdentity: "Joie Pact / Türkiye kılavuz kapsamı / renk-SKU doğrulanmadı", type: ["COMPACT_TRAVEL", "TRAVEL_SYSTEM_COMPATIBLE"], trApplicability: { status: "VERIFIED", evidenceIds: ["JOIE-PACT-MANUAL"] }, facts: { ...unknownFacts, travelSystemCompatible: true }, included: [], separatelySold: ["uyumlu bebek oto koltuğu ve adaptör: exact kombinasyon doğrulanmalı"], evidenceIds: ["JOIE-PACT-MANUAL"] },
  { exactProductId: "JOIE_TOURIST_TR", manufacturer: "Joie", model: "Tourist", configurationIdentity: "Joie Tourist / Türkiye kılavuz kapsamı / renk-SKU doğrulanmadı", type: ["COMPACT_TRAVEL", "TRAVEL_SYSTEM_COMPATIBLE"], trApplicability: { status: "VERIFIED", evidenceIds: ["JOIE-TOURIST-MANUAL"] }, facts: { ...unknownFacts, newbornUse: "SEAT_LIE_FLAT", travelSystemCompatible: true }, included: [], separatelySold: ["uyumlu taşıma sistemi bileşenleri: exact kombinasyon doğrulanmalı"], evidenceIds: ["JOIE-TOURIST-MANUAL"] },
]);

export const STROLLER_DISCOVERY_RECONCILIATION = Object.freeze({ discovered: 8, admitted: 3, rejectedInsufficientTrApplicability: 3, rejectedIdentityAmbiguous: 2, duplicate: 0, retiredUnsupported: 0, silentDrops: 0 });
