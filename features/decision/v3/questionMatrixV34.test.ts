import { describe, expect, it } from "vitest";
import { activeDecisionPreferences } from "./ledger";
import { evaluateV3Catalog } from "./catalogAdapter.server";
import { createV3ConversationState, runV3Turn } from "./engine.server";
import { usageQuestionOrder } from "./usageQuestionMatrix";

async function turn(state: ReturnType<typeof createV3ConversationState>, id: string, message: string) {
  return runV3Turn({ conversationId: state.conversationId, messageId: id, message, expectedRevision: state.revision, state });
}

describe("V3.4 usage-specific question matrix", () => {
  it("asks structural filters before candidate-backed equipment discovery", async () => {
    let state = createV3ConversationState("urban-matrix");
    state = (await turn(state, "1", "Yeni araç almak istiyorum")).state;
    const output = await turn(state, "2", "Şehir içinde günlük kullanacağım");
    expect(output.state.lastQuestionKey).toBe("bodyStyle");
  });

  it("prioritizes fuel before body for commercial load use", async () => {
    let state = createV3ConversationState("commercial-matrix");
    state = (await turn(state, "1", "Araç almak istiyorum")).state;
    const output = await turn(state, "2", "İşim için yük ve malzeme taşıyacağım");
    expect(output.state.lastQuestionKey).toBe("fuelType");
  });

  it("keeps budget immediately after body once earlier usage priorities are resolved", async () => {
    let state = createV3ConversationState("urban-budget-order");
    for (const [id, message] of [["1", "Araç almak istiyorum"], ["2", "Şehir içinde günlük kullanacağım"], ["3", "Geri görüş kamerası kesin olsun"], ["4", "Parkı kolay hatchback olsun"]] as const) state = (await turn(state, id, message)).state;
    expect(state.lastQuestionKey).toBe("fuelType");
  });

  it("projects an explicit equipment answer as a hard catalog preference", async () => {
    let state = createV3ConversationState("equipment-ledger");
    state = (await turn(state, "1", "Geri görüş kamerası olan yeni bir araç istiyorum")).state;
    expect(activeDecisionPreferences(state.ledger)).toEqual(expect.arrayContaining([expect.objectContaining({ concept: "equipmentFeature", field: "equipmentFeature", normalizedValue: "REAR_VIEW_CAMERA", decisionUse: "HARD_FILTER" })]));
    const baseline = await evaluateV3Catalog(state.ledger.filter((item) => item.field !== "equipmentFeature")); const catalog = await evaluateV3Catalog(state.ledger);
    expect(catalog.variants.length).toBeGreaterThan(0);
    expect(catalog.candidateIds).toEqual(baseline.candidateIds);
    expect(catalog.appliedEquipment).toHaveLength(1);
  });

  it("publishes deterministic matrix order by usage type", () => {
    expect(usageQuestionOrder("URBAN_DAILY").slice(0, 2)).toEqual(["parkingEquipment", "bodyStyle"]);
    expect(usageQuestionOrder("COMMERCIAL").slice(0, 2)).toEqual(["fuelType", "bodyStyle"]);
    expect(usageQuestionOrder("LONG_DISTANCE")[0]).toBe("longDistanceEquipment");
  });

  it("records an explicit glass-roof requirement without asking for more equipment", async () => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    let state = createV3ConversationState("glass-roof-persona");
    let output = await turn(state, "1", "Sıfır km bir SUV satın almak istiyorum. Günlük şehir içinde kullanacağım, kesin bütçe üst sınırım 3.200.000 TL. Benzinli ve otomatik olsun, cam tavan kesinlikle bulunsun. Karizmatik ve zamansız tasarım seviyorum.");
    state = output.state;
    expect(state.lastQuestionKey).toBe("confirm:distinctiveDesign");
    expect(activeDecisionPreferences(state.ledger)).toEqual(expect.arrayContaining([
      expect.objectContaining({ concept: "equipmentFeature", field: "equipmentFeature", normalizedValue: "PANORAMIC_GLASS_ROOF", decisionUse: "HARD_FILTER" }),
    ]));

    output = await turn(state, "2", "Evet");
    expect(output.state.lastQuestionKey).toBe("brandModel");
    expect(output.offerAwaitingConsent).not.toBe(true);
    expect(output.message).not.toMatch(/gerçekten ayıran donanım/iu);
    expect(activeDecisionPreferences(output.state.ledger)).toEqual(expect.arrayContaining([
      expect.objectContaining({ concept: "distinctiveDesign", decisionUse: "SOFT_RANK" }),
    ]));
  });

  it("does not ask a categorical equipment question before structural choices", async () => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    let state = createV3ConversationState("equipment-choice");
    state = (await turn(state, "1", "Şehir içinde kullanmak için yeni bir SUV almak istiyorum")).state;
    expect(state.lastQuestionKey).toBe("fuelType");
    const output = await turn(state, "2", "Evet");
    expect(output.state.purchaseIntent).not.toBe("NOT_EXPRESSED");
    expect(output.state.lastQuestionKey).not.toBe("parkingEquipment");
    expect(output.message).not.toMatch(/Merhaba/iu);
  });
});
