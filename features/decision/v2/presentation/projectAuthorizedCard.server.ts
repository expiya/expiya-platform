import type { CatalogSnapshot, CatalogVariantSnapshot } from "../catalog/types";
import type { PersistedAuthorizedCandidateRef, PersistedGovernedOffer } from "../offer/types";
import { decisionSafePublicCardSchema, type DecisionSafePublicCard } from "./publicCardSchema";
import { PUBLIC_CARD_REASON_TEXT, V2_PUBLIC_CARD_POLICY } from "./publicCardPolicy";

export class AuthorizedCardProjectionError extends Error {
  constructor(readonly code: string) { super(code); }
}

const fuelLabels: Readonly<Record<string, string>> = Object.freeze({
  GASOLINE: "Benzin", DIESEL: "Dizel", LPG: "LPG", MHEV: "Hafif hibrit",
  HEV: "Tam hibrit", PHEV: "Şarj edilebilir hibrit", BEV: "Elektrik", HYDROGEN: "Hidrojen",
});

function transmissionLabel(value: string): string {
  if (/manual/iu.test(value)) return "Manuel";
  if (/dual-clutch/iu.test(value)) return "Çift kavramalı otomatik";
  if (/single-speed/iu.test(value)) return "Tek oranlı otomatik";
  if (/automatic/iu.test(value)) return "Otomatik";
  return "Otomatik";
}

function projectOne(variant: CatalogVariantSnapshot, ref: PersistedAuthorizedCandidateRef): DecisionSafePublicCard {
  const observation = variant.activeNewPrice;
  const priceAllowed = ref.priceRealizationPermission === "EXACT_PUBLIC_PRICE_ALLOWED"
    && observation?.realizationSafe === true
    && observation.consumerVisibility === "PUBLIC"
    && (observation.priceType === "LIST" || observation.priceType === "CAMPAIGN");
  const recommendation = PUBLIC_CARD_REASON_TEXT[ref.finalDisposition as keyof typeof PUBLIC_CARD_REASON_TEXT];
  if (!recommendation) throw new AuthorizedCardProjectionError("DISPOSITION_NOT_PUBLIC_CARD_ELIGIBLE");
  const caveats = ref.caveatFactIds.map(() => "Bu seçenek ek bir fiyat veya uygunluk açıklaması gerektiriyor.");
  return decisionSafePublicCardSchema.parse({
    exactVariantId: variant.id,
    title: `${variant.brand} ${variant.model} ${variant.trim}`.replace(/\s+/gu, " ").trim(),
    brand: variant.brand,
    model: variant.model,
    trim: variant.trim,
    modelYear: variant.decisionFacts.modelYear.value,
    fuelLabel: fuelLabels[variant.decisionFacts.powertrain.fuelType.value],
    transmissionLabel: transmissionLabel(variant.decisionFacts.powertrain.transmission.value),
    bodyTypeLabel: variant.decisionFacts.bodyStyle.value,
    image: V2_PUBLIC_CARD_POLICY.placeholderImage,
    imageStatus: "PLACEHOLDER",
    decisionSummary: {
      recommendation,
      reasons: [recommendation, ...caveats],
      confidenceLabel: priceAllowed ? "YUKSEK" : "ORTA",
    },
    caveats,
    ...(priceAllowed ? { verifiedPublicPrice: {
      amountTry: observation.amountTry,
      priceType: observation.priceType,
      validFrom: observation.validFrom,
      validUntil: observation.validUntil,
    } } : {}),
  });
}

export function projectAuthorizedPublicCards(input: {
  readonly offer: PersistedGovernedOffer;
  readonly conversationId: string;
  readonly decisionFingerprint: string;
  readonly snapshot: CatalogSnapshot;
}): readonly DecisionSafePublicCard[] {
  if (input.offer.lifecycleState !== "REVEALED") throw new AuthorizedCardProjectionError("OFFER_NOT_REVEALED");
  if (input.offer.conversationId !== input.conversationId) throw new AuthorizedCardProjectionError("WRONG_CONVERSATION");
  if (input.offer.catalogFingerprint !== input.snapshot.authority.catalogFingerprint
    || input.offer.catalogReleaseVersion !== input.snapshot.authority.releaseVersion) {
    throw new AuthorizedCardProjectionError("CATALOG_FINGERPRINT_MISMATCH");
  }
  if (input.offer.decisionFingerprint !== input.decisionFingerprint) throw new AuthorizedCardProjectionError("DECISION_FINGERPRINT_MISMATCH");
  if (input.offer.candidateRefs.length < 1 || input.offer.candidateRefs.length > V2_PUBLIC_CARD_POLICY.maximumCards) {
    throw new AuthorizedCardProjectionError("INVALID_CARD_COUNT");
  }
  return Object.freeze(input.offer.candidateRefs.map((ref) => {
    const variant = input.snapshot.variantById.get(ref.exactVariantId);
    if (!variant) throw new AuthorizedCardProjectionError("AUTHORIZED_VARIANT_NOT_IN_PINNED_SNAPSHOT");
    return Object.freeze(projectOne(variant, ref));
  }));
}
