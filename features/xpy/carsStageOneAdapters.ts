import type { V3PublicResponse } from "@/features/decision/v3/types";
import type { RecommendedCar } from "@/types/recommendation";
import { priceFreshnessWarning } from "@/components/cars/priceFreshnessWarning";
import { defineXpyStageOnePresentationAdapter, XPY_STAGE_ONE_PRESENTATION_VERSION } from "./stageOnePresentation";

const fuel: Readonly<Record<string, string>> = { Gasoline: "Benzin", Diesel: "Dizel", Hybrid: "Hibrit", Electric: "Elektrik" };
export const LEGACY_CARS_STAGE_ONE_PRESENTATION = defineXpyStageOnePresentationAdapter<RecommendedCar>({
  adapterId: "cars-legacy-stage1-presentation/v1", version: XPY_STAGE_ONE_PRESENTATION_VERSION,
  project({ car, decision, pricePresentation }) {
    const price = pricePresentation ?? (car.priceDisplayAllowed !== false ? { amountTry: car.price, priceType: "LIST" as const, validityStatus: "UNKNOWN" as const } : undefined);
    const freshness = priceFreshnessWarning(pricePresentation, "tr");
    const observedAt = pricePresentation?.validFrom ?? pricePresentation?.validUntil ?? car.updatedAt;
    const mediaScope = car.imageStatus === "REPRESENTATIVE" || car.imageStatus === "APPROXIMATE"
      ? `Temsilî görsel${car.imageRepresentativeOf ? `: ${car.imageRepresentativeOf}` : ""}${car.imageAttribution ? ` · Kaynak: ${car.imageAttribution}` : ""}`
      : car.imageAttribution ? `Görsel kaynağı: ${car.imageAttribution}` : undefined;
    return { schemaVersion: XPY_STAGE_ONE_PRESENTATION_VERSION, exactIdentity: { id: car.id, brand: car.brand, model: car.model, configuration: `${car.year} · ${fuel[car.fuel] ?? car.fuel} · ${car.transmission} · ${car.bodyType}` }, media: { status: car.imageStatus === "EXACT" ? "EXACT" : car.imageStatus === "PLACEHOLDER" ? "UNAVAILABLE" : "REPRESENTATIVE", src: car.imageStatus === "PLACEHOLDER" ? undefined : car.image, alt: `${car.brand} ${car.model} araç görseli`, authorityLabel: mediaScope }, badge: "Doğrulanmış karar sonucu · Aşama 1", reasons: decision.reasons.length ? decision.reasons : [decision.recommendation], matchedNeeds: decision.reasons, supportingContext: [], technicalFacts: [], capabilities: [], limitations: [pricePresentation?.caveat, freshness].filter((item): item is string => Boolean(item)), offers: price ? [{ merchant: "Resmî fiyat kaynağı", amount: price.amountTry, currency: "TRY", observedAt, availability: price.priceType === "CAMPAIGN" ? "Kampanya fiyatı" : "Liste fiyatı" }] : [], commerceNotice: price ? "Fiyat bilgisi stok veya bağlayıcı satış teklifi garantisi değildir." : "Güncel fiyat doğrulanıyor; katalog kaydı stok veya satış fiyatı garantisi değildir.", sources: car.imageAttribution ? [{ label: `Görsel kaynağı: ${car.imageAttribution}` }] : [], audit: { "Karar kimliği": decision.decisionId, "Exact araç kimliği": car.id }, continuation: { label: "Ayrıntılı analizi aç", href: `/decision/${encodeURIComponent(decision.decisionId)}` } };
  },
});

type V3Recommendation = NonNullable<V3PublicResponse["recommendations"]>[number];
export const V3_CARS_STAGE_ONE_PRESENTATION = defineXpyStageOnePresentationAdapter<V3Recommendation>({
  adapterId: "cars-v3-stage1-presentation/v1", version: XPY_STAGE_ONE_PRESENTATION_VERSION,
  project(item) {
    const title = item.title.trim(); const [brand = "Araç", ...model] = title.split(/\s+/u);
    return { schemaVersion: XPY_STAGE_ONE_PRESENTATION_VERSION, exactIdentity: { id: item.id, brand, model: model.join(" ") || title, configuration: item.representedModel ? `Görsel kapsamı: ${item.representedModel}` : "Seçilen varyant" }, media: { status: item.imageStatus === "EXACT" ? "EXACT" : item.imageStatus === "PLACEHOLDER" ? "UNAVAILABLE" : "REPRESENTATIVE", src: item.imageStatus === "PLACEHOLDER" ? undefined : item.image, alt: `${title} araç görseli`, authorityLabel: item.imageAttribution }, badge: item.badge ?? "Doğrulanmış karar sonucu · Aşama 1", reasons: ["Görüşmede kabul edilen ihtiyaçlara göre seçildi."], matchedNeeds: ["Kabul edilen araç ihtiyaçlarıyla eşleşiyor."], supportingContext: [], technicalFacts: [], capabilities: [], limitations: item.warning ? [item.warning] : [], offers: [], commerceNotice: "Güncel satış teklifi bu kartta doğrulanmıyor; katalog üyeliği stok garantisi değildir.", sources: item.imageAttribution ? [{ label: `Görsel kaynağı: ${item.imageAttribution}` }] : [], audit: { "Exact varyant kimliği": item.id } };
  },
});
