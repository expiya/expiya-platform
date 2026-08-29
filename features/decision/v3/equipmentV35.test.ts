import { describe, expect, it } from "vitest";
import { evaluateV3Catalog, v35EquipmentMatchAuthority, v35EquipmentSelectionWarning } from "./catalogAdapter.server";
import { createV3ConversationState, runV3Turn } from "./engine.server";
import { applyPreferenceMessage } from "./ledger";
import type { PreferenceEvent, V3ConversationState } from "./types";
import { createRecommendationTermsAcceptance } from "@/lib/legal/recommendationTerms";
import { advanceV3ToOffer, revealV3TestOffer } from "./testConversationDecision";

async function conversation(id: string, messages: readonly string[]) {
  let state: V3ConversationState = createV3ConversationState(id); let output;
  for (const [index, message] of messages.entries()) { output = await runV3Turn({ conversationId: id, messageId: `${id}-${index}`, message, expectedRevision: state.revision, state, ...(state.pendingOffer ? { recommendationTermsAcceptance: createRecommendationTermsAcceptance() } : {}) }); state = output.state; }
  return output!;
}

describe("V3.5 unverified equipment selection", () => {
  it.each([
    ["Tavan taşıyıcı takılabilen bir araç olsun", ["ROOF_RACK_COMPATIBILITY"]],
    ["Bagaj filesi bağlanabilen bir araç istiyorum", ["CARGO_NET_COMPATIBILITY"]],
    ["Tavan rayları ve bagaj filesi şart", ["ROOF_RAILS", "CARGO_NET"]],
  ])("normalizes compatibility intent without promoting it to equipment presence: %s", async (message, expected) => {
    const state = createV3ConversationState(`compatibility-${expected.join("-")}`);
    const output = applyPreferenceMessage(state, `compatibility-${expected.join("-")}-0`, message);
    for (const value of expected) expect(output.ledger.some((event) => event.status === "ACTIVE" && event.normalizedValue === value)).toBe(true);
  });

  it("keeps unverified candidates when an exact-verified match exists", async () => {
    const output = await conversation("unverified-query", ["Anahtarsız çalıştırmalı yeni araç istiyorum"]);
    const catalog = await evaluateV3Catalog(output.state.ledger);
    expect(catalog.appliedEquipment).toHaveLength(1);
    expect(catalog.variants.some((variant) => v35EquipmentMatchAuthority(variant, "KEYLESS_START") === "VERIFIED")).toBe(true);
    expect(catalog.variants.some((variant) => v35EquipmentMatchAuthority(variant, "KEYLESS_START") === "UNVERIFIED")).toBe(true);
    expect(catalog.variants.every((variant) => v35EquipmentMatchAuthority(variant, "KEYLESS_START") !== "NO_MATCH")).toBe(true);
  });

  it("does not use foreign-market owner-manual capability as a filter", async () => {
    const preference = { concept: "equipmentFeature", field: "equipmentFeature", normalizedValue: "ROOF_RAILS", strength: "EXPLICIT_STRONG", status: "ACTIVE", decisionUse: "HARD_FILTER" } as PreferenceEvent;
    const catalog = await evaluateV3Catalog([preference]);
    const tucson = catalog.variants.filter((variant) => variant.brand === "Hyundai" && variant.model === "TUCSON");
    expect(tucson.length).toBeGreaterThan(0);
    expect(tucson.every((variant) => v35EquipmentMatchAuthority(variant, "ROOF_RAILS") === "UNVERIFIED")).toBe(true);
    expect(catalog.unsupportedEquipment).toHaveLength(1);
    expect(v35EquipmentSelectionWarning(tucson[0]!, [preference])).toMatch(/doğrulanması gerekir/iu);
  });

  it("does not warn when the selected equipment match is verified", async () => {
    const catalog = await evaluateV3Catalog([]);
    const verified = catalog.variants.find((variant) => v35EquipmentMatchAuthority(variant, "KEYLESS_START") === "VERIFIED");
    const preference = { concept: "equipmentFeature", field: "equipmentFeature", normalizedValue: "KEYLESS_START", strength: "EXPLICIT_STRONG", status: "ACTIVE", decisionUse: "HARD_FILTER" } as PreferenceEvent;
    expect(verified).toBeDefined();
    expect(v35EquipmentSelectionWarning(verified!, [preference])).toBeUndefined();
  });

  it("does not collapse the electric-city transcript to the only richly verified variant", async () => {
    let state = createV3ConversationState("electric-city-unverified-cohort");
    for (const [index, message] of [
      "Tam elektrikli bir araç istiyorum",
      "Şehir içinde günlük kullanacağım",
      "Geri görüş kamerası, ön ve arka park sensörleri vazgeçilmez",
      "Temassız açılan bagaj kapağı, anahtarsız giriş ve anahtarsız çalıştırma vazgeçilmez",
    ].entries()) {
      const applied = applyPreferenceMessage(state, `electric-city-${index}`, message);
      state = { ...state, ledger: applied.ledger, pendingConfirmation: applied.pending };
    }
    const catalog = await evaluateV3Catalog(state.ledger);
    expect(catalog.variants.length).toBeGreaterThan(1);
    expect(catalog.variants.some((variant) => variant.id === "5a64b246-3b05-52b6-9f24-b8f52ccc2305")).toBe(true);
    expect(catalog.variants.some((variant) => v35EquipmentMatchAuthority(variant, "HANDS_FREE_TAILGATE") === "UNVERIFIED")).toBe(true);
  });

  it("publishes the warning on a card selected through unverified equipment", async () => {
    let output = await conversation("unverified-card", [
      "Aile kullanımı için SUV araç almak istiyorum", "Anahtarsız çalıştırma kesin olsun", "Bütçe sorun değil",
      "Dizel olsun", "Alfa Romeo Tonale olabilir", "Tek araç öner",
    ]);
    output = await advanceV3ToOffer(output, "unverified-card-advance");
    output = await revealV3TestOffer(output, "unverified-card-reveal");
    expect(output.recommendations).toHaveLength(1);
    expect(output.recommendations![0]?.warning).toMatch(/doğrulanması gerekir/iu);
  });
});
