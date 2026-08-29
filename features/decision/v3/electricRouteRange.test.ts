import { describe, expect, it } from "vitest";
import { createV3ConversationState, runV3Turn } from "./engine.server";
import { activeDecisionPreferences } from "./ledger";
import { deriveElectricRouteRangeRequirement } from "./electricRouteRange";
import { evaluateV3Catalog } from "./catalogAdapter.server";

describe("electric route range requirement", () => {
  it("turns an explicit Istanbul-Bursa round trip into a conservative catalog-range floor", () => {
    expect(deriveElectricRouteRangeRequirement("İstanbul'dan Bursa'ya gidiş geliş için menzil yeterli olsun istiyorum"))
      .toMatchObject({ origin: "İstanbul", destination: "Bursa", plannedDistanceKm: 310, minimumCatalogRangeKm: 380, roundTrip: true });
  });

  it("does not invent a round-trip requirement for a one-way city mention", () => {
    expect(deriveElectricRouteRangeRequirement("İstanbul'dan Bursa'ya gideceğim")).toBeUndefined();
  });

  it("filters electric candidates below the route floor and explains the calculation", async () => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    const id = "istanbul-bursa-single-charge";
    let output = await runV3Turn({ conversationId: id, messageId: "1", message: "Elektrikli bir araç almak istiyorum", expectedRevision: 0, state: createV3ConversationState(id) });
    const electricCount = (await evaluateV3Catalog(output.state.ledger)).variants.length;
    output = await runV3Turn({
      conversationId: id,
      messageId: "2",
      message: "Günlük kullanacağım; İstanbul'dan Bursa'ya gidiş geliş için menzili tek şarjda yeterli olsun.",
      expectedRevision: output.state.revision,
      state: output.state,
    });
    const range = activeDecisionPreferences(output.state.ledger).find((item) => item.concept === "minimumElectricRange");
    expect(range).toMatchObject({ field: "electricRangeKmMin", normalizedValue: 380, decisionUse: "HARD_FILTER" });
    const catalog = await evaluateV3Catalog(output.state.ledger);
    expect(catalog.variants.length).toBeGreaterThan(0);
    expect(catalog.variants.length).toBeLessThan(electricCount);
    expect(output.message).toMatch(/yaklaşık 310 km.*en az 380 km katalog menzili/iu);
  });
});
