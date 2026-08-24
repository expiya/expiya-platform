import { afterEach, describe, expect, it } from "vitest";
import { activeDecisionPreferences, latestActiveLedgerEvent } from "./ledger";
import { evaluateV3Catalog } from "./catalogAdapter.server";
import { runV3Turn } from "./engine.server";
import { routeConversationMessage } from "./router";

const priorDisabled = process.env.CARS_V31_PROVIDER_DISABLED;
afterEach(() => { if (priorDisabled === undefined) delete process.env.CARS_V31_PROVIDER_DISABLED; else process.env.CARS_V31_PROVIDER_DISABLED = priorDisabled; });

describe("V3.6 composite purchase and decision messages", () => {
  const message = "Toyota marka Corolla Hibrit aracımı yine Toyota'nın tam elektrikli bir modeli ile değiştirmek istiyorum. Hangi modeli önerirsin?";

  it("routes purchase intent, target preferences and decision request as recommendation authority", () => {
    expect(routeConversationMessage(message, { hasPurchaseIntent: false, hasOpenQuestion: false })).toMatchObject({ route: "RECOMMENDATION_OR_OFFER", decisionMutationAllowed: true });
  });

  it("separates the current car context from desired Toyota BEV preferences", async () => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    const output = await runV3Turn({ conversationId: "composite-ledger", messageId: "1", message, expectedRevision: 0 });
    expect(output.state.purchaseIntent).toBe("EXPLICIT");
    expect(latestActiveLedgerEvent(output.state.ledger, "currentVehicleContext")?.decisionUse).toBe("NONE");
    expect(activeDecisionPreferences(output.state.ledger)).toEqual(expect.arrayContaining([
      expect.objectContaining({ concept: "brandPreference", normalizedValue: "Toyota", decisionUse: "HARD_FILTER" }),
      expect.objectContaining({ concept: "fuelType", normalizedValue: "BEV", decisionUse: "HARD_FILTER" }),
    ]));
    expect(activeDecisionPreferences(output.state.ledger).some((item) => item.normalizedValue === "HEV")).toBe(false);
  });

  it("states catalog absence and binds yes to brand relaxation instead of greeting", async () => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    let output = await runV3Turn({ conversationId: "composite-flow", messageId: "1", message, expectedRevision: 0 });
    expect(output.message).toMatch(/aktif katalogda.*satıştaki bir varyant bulunmuyor/iu);
    expect(output.message).toMatch(/tam elektrikli tercihini koruyup markayı esnetelim mi/iu);
    expect(output.state.pendingAction).toBe("RELAX_BRAND_FOR_POWERTRAIN");
    output = await runV3Turn({ conversationId: "composite-flow", messageId: "2", message: "Toyota'nın elektrikli modelini satın almak istiyorum.", expectedRevision: output.state.revision, state: output.state });
    expect(output.state.pendingAction).toBe("RELAX_BRAND_FOR_POWERTRAIN");
    output = await runV3Turn({ conversationId: "composite-flow", messageId: "3", message: "Evet seçelim.", expectedRevision: output.state.revision, state: output.state });
    expect(output.message).not.toMatch(/Merhaba|Nasıl gidiyor/iu);
    expect(output.state.lastQuestionKey).toBe("primaryUsage");
    expect(activeDecisionPreferences(output.state.ledger).some((item) => item.concept === "brandPreference")).toBe(false);
    expect(activeDecisionPreferences(output.state.ledger).some((item) => item.concept === "fuelType" && item.normalizedValue === "BEV")).toBe(true);
  });

  it("confirms active catalog has no Toyota BEV", async () => {
    const catalog = await evaluateV3Catalog([]);
    expect(catalog.variants.some((variant) => variant.brand.localeCompare("Toyota", "tr", { sensitivity: "base" }) === 0 && variant.decisionFacts.powertrain.fuelType.value === "BEV")).toBe(false);
  });

  it("recognizes a catalog-style model name followed by purchase intent without a generic vehicle word", async () => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    const message = "Corolla almak istiyorum.";
    expect(routeConversationMessage(message, { hasPurchaseIntent: false, hasOpenQuestion: false }).route).toBe("PURCHASE_INTENT_DISCOVERY");
    const output = await runV3Turn({ conversationId: "named-model", messageId: "1", message, expectedRevision: 0 });
    expect(output.message).not.toMatch(/Merhaba|Nasıl gidiyor/iu);
    expect(output.state.purchaseIntent).toBe("EXPLICIT");
    expect(activeDecisionPreferences(output.state.ledger)).toEqual(expect.arrayContaining([expect.objectContaining({ concept: "modelPreference", field: "model", normalizedValue: "Corolla", decisionUse: "HARD_FILTER" })]));
    expect(output.state.lastQuestionKey).toBe("budget");
    const catalog = await evaluateV3Catalog(output.state.ledger);
    expect(catalog.variants.length).toBeGreaterThan(0);
    expect(catalog.variants.every((variant) => variant.model.localeCompare("Corolla", "tr", { sensitivity: "base" }) === 0)).toBe(true);
  });

  it("does not turn an off-topic named product purchase into car intent", () => {
    expect(routeConversationMessage("iPhone almak istiyorum.", { hasPurchaseIntent: false, hasOpenQuestion: false }).route).toBe("OFF_TOPIC_REQUEST");
  });
});
