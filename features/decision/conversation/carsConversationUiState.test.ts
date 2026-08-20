import { describe, expect, it } from "vitest";

import {
  greetingShouldHideVehicleQuickReplies,
  hasActiveFinalDiscriminator,
  shouldLockTextInput,
  shouldRenderRecommendationCards,
  shouldShowRecommendationTermsGate,
  shouldShowVehicleQuickReplies,
} from "./carsConversationUiState";

describe("hasActiveFinalDiscriminator", () => {
  it("locks text only while the latest assistant turn exposes structured choices", () => {
    expect(hasActiveFinalDiscriminator([{ id: "1", role: "assistant", content: "Seçin", discriminatorChoices: [
      { id: "MAX_CARGO", label: "Daha fazla bagaj alanı" },
    ] }])).toBe(true);
    expect(hasActiveFinalDiscriminator([{ id: "1", role: "assistant", content: "Devam edin" }])).toBe(false);
    expect(hasActiveFinalDiscriminator([
      { id: "1", role: "assistant", content: "Seçin", discriminatorChoices: [{ id: "MAX_CARGO", label: "Bagaj" }] },
      { id: "2", role: "user", content: "Bagaj" },
    ])).toBe(false);
  });
});

describe("consent UI helpers", () => {
  it("hides vehicle quick replies after a pure greeting even if options leak from the model", () => {
    expect(greetingShouldHideVehicleQuickReplies("Merhaba")).toBe(true);
    expect(shouldShowVehicleQuickReplies("Merhaba", ["Kamp ve stabilize yol"])).toBe(false);
    expect(shouldShowVehicleQuickReplies("Merhaba :)", ["7 koltuk"])).toBe(false);
    expect(shouldShowVehicleQuickReplies("Aile için araç bakıyorum", ["Kamp ve stabilize yol"])).toBe(true);
  });

  it("renders a vehicle card only after a recommendations response", () => {
    expect(shouldRenderRecommendationCards("QUESTION")).toBe(false);
    expect(shouldRenderRecommendationCards("RECOMMENDATIONS")).toBe(true);
    expect(shouldRenderRecommendationCards("RECOMMENDATIONS", "MODEL_FIT_OFFER")).toBe(true);
    expect(shouldRenderRecommendationCards("RECOMMENDATIONS", "PURCHASE_OPTION_OFFER")).toBe(false);
    expect(shouldRenderRecommendationCards("RECOMMENDATIONS", "NO_AFFORDABLE_MATCH")).toBe(false);
    expect(shouldRenderRecommendationCards("RECOMMENDATIONS", "NEW_CONFIGURATION_OFFER")).toBe(true);
    expect(shouldRenderRecommendationCards("ERROR")).toBe(false);
  });

  it("locks typed input only for the final discriminator", () => {
    expect(shouldLockTextInput([{ id: "1", role: "assistant", content: "Güçlü bir önerim var. Görmek ister misiniz?" }])).toBe(false);
    expect(shouldLockTextInput([{ id: "1", role: "assistant", content: "Seçin", discriminatorChoices: [
      { id: "MAX_CARGO", label: "Daha fazla bagaj alanı" },
    ] }])).toBe(true);
  });

  it("shows the legal gate for a V2 sealed offer without relying on the legacy conversation trace", () => {
    const offered = [{ id: "1", role: "assistant" as const, content: "Görmek ister misin?", v2OfferToken: "v2.sealed" }];
    expect(shouldShowRecommendationTermsGate(offered, undefined)).toBe(true);
    expect(shouldShowRecommendationTermsGate([{ ...offered[0], v2Cards: [{ exactVariantId: "variant" } as never] }], undefined)).toBe(false);
    expect(shouldShowRecommendationTermsGate([{ id: "1", role: "assistant", content: "Devam" }], undefined)).toBe(false);
  });
});
