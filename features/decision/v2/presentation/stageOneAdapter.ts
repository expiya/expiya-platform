import type { DecisionSafePublicCard } from "./publicCardSchema";
import { defineXpyStageOnePresentationAdapter, XPY_STAGE_ONE_PRESENTATION_VERSION } from "@/features/xpy/stageOnePresentation";

export const CARS_STAGE_ONE_PRESENTATION = defineXpyStageOnePresentationAdapter<DecisionSafePublicCard>({
  adapterId: "cars-stage1-presentation/v1", version: XPY_STAGE_ONE_PRESENTATION_VERSION,
  project(card) {
    return {
      schemaVersion: XPY_STAGE_ONE_PRESENTATION_VERSION,
      exactIdentity: { id: card.exactVariantId, brand: card.brand, model: card.model, configuration: [card.trim, card.modelYear, card.fuelLabel, card.transmissionLabel, card.bodyTypeLabel].filter(Boolean).join(" · ") },
      media: { status: card.imageStatus === "EXACT" ? "EXACT" : card.imageStatus === "PLACEHOLDER" ? "UNAVAILABLE" : "REPRESENTATIVE", src: card.image, alt: `${card.brand} ${card.model} ${card.trim} araç görseli`, authorityLabel: card.imageStatus === "EXACT" ? card.imageAttribution : `Temsilî görsel${card.representedModel ? `: ${card.representedModel}` : ""}${card.imageAttribution ? ` · ${card.imageAttribution}` : ""}` },
      badge: "Doğrulanmış karar sonucu · Aşama 1", reasons: card.decisionSummary.reasons.length ? card.decisionSummary.reasons : [card.decisionSummary.recommendation], matchedNeeds: card.decisionSummary.reasons,
      supportingContext: [], technicalFacts: [], capabilities: [], limitations: card.caveats,
      offers: card.verifiedPublicPrice?.validFrom ? [{ merchant: "Resmî fiyat kaynağı", amount: card.verifiedPublicPrice.amountTry, currency: "TRY", observedAt: card.verifiedPublicPrice.validFrom, availability: card.verifiedPublicPrice.priceType === "CAMPAIGN" ? "Kampanya fiyatı" : "Liste fiyatı" }] : [],
      commerceNotice: "Bu exact araç için güncel satış teklifi gösterilemiyor; katalog kaydı stok veya satış fiyatı garantisi değildir.",
      sources: card.imageAttribution ? [{ label: `Görsel kaynağı: ${card.imageAttribution}` }] : [], audit: { "Exact varyant kimliği": card.exactVariantId },
      continuation: { label: "Ayrıntılı analizi aç", href: `/decision/v2-${encodeURIComponent(card.exactVariantId)}` },
    };
  },
});
