import { afterEach, describe, expect, it } from "vitest";
import { activeDecisionPreferences, latestActiveLedgerEvent } from "./ledger";
import { evaluateV3Catalog, rankV3Candidates } from "./catalogAdapter.server";
import { createV3ConversationState, runV3Turn } from "./engine.server";
import { routeConversationMessage } from "./router";

const priorDisabled = process.env.CARS_V31_PROVIDER_DISABLED;
afterEach(() => { if (priorDisabled === undefined) delete process.env.CARS_V31_PROVIDER_DISABLED; else process.env.CARS_V31_PROVIDER_DISABLED = priorDisabled; });

async function turn(state: ReturnType<typeof createV3ConversationState>, id: string, message: string) { return runV3Turn({ conversationId: state.conversationId, messageId: id, message, expectedRevision: state.revision, state }); }

describe("V3.7 conversation and ranking corrections", () => {
  it("does not mistake the suffix in ilgimi for a Turkish question particle", async () => {
    const message = "Elektrikli modeller daha çok ilgimi çekiyor.";
    expect(routeConversationMessage(message, { hasPurchaseIntent: true, hasOpenQuestion: true }).route).toBe("VEHICLE_PREFERENCE_UPDATE");
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    let state = createV3ConversationState("electric-interest"); state = (await turn(state, "1", "Araç almak istiyorum")).state;
    const output = await turn(state, "2", message);
    expect(activeDecisionPreferences(output.state.ledger)).toEqual(expect.arrayContaining([expect.objectContaining({ concept: "fuelType", normalizedValue: "BEV", decisionUse: "HARD_FILTER" })]));
    expect(output.message).not.toMatch(/yeterince güvenilir ve somut bir yanıt veremiyorum/iu);
  });

  it("reflects newly learned usage once instead of prefixing every question", async () => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    let state = createV3ConversationState("short-context"); state = (await turn(state, "1", "Araç almak istiyorum")).state;
    let output = await turn(state, "2", "Şehir içinde günlük kullanacağım"); state = output.state;
    expect(output.message).toMatch(/Şehir içindeki günlük kullanımını/iu);
    output = await turn(state, "3", "Özel bir park donanımı şart değil");
    expect(output.message).not.toMatch(/Şehir içindeki günlük kullanımını|Günlük kullanımda.*düşünerek sorayım/iu);
  });

  it("stores uncertain budget language as soft rank and asks for an exact ceiling later", async () => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    let state = createV3ConversationState("uncertain-budget");
    for (const [id, message] of [["1", "Şehir içinde kullanmak için SUV araç almak istiyorum"], ["2", "Elektrikli olsun"], ["3", "2 milyona kadar çıkabiliriz sanırım, çok net değil"]] as const) state = (await turn(state, id, message)).state;
    expect(latestActiveLedgerEvent(state.ledger, "budgetTarget")).toMatchObject({ normalizedValue: 2_000_000, decisionUse: "SOFT_RANK" });
    expect(latestActiveLedgerEvent(state.ledger, "budgetMax")).toBeUndefined();
  });

  it("ranks a hard-budget pool toward the ceiling instead of the cheapest vehicle", async () => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    let state = createV3ConversationState("budget-ranking");
    for (const [id, message] of [["1", "Şehir içinde SUV araç almak istiyorum"], ["2", "Kesin bütçem 2 milyon TL"]] as const) state = (await turn(state, id, message)).state;
    const catalog = await evaluateV3Catalog(state.ledger); const ranked = rankV3Candidates(catalog.variants, state.ledger);
    const priced = catalog.variants.filter((variant) => variant.activeNewPrice).map((variant) => variant.activeNewPrice!.amountTry);
    expect(ranked[0]?.activeNewPrice?.amountTry).toBe(Math.max(...priced));
    expect(ranked[0]?.activeNewPrice?.amountTry).toBeLessThanOrEqual(2_000_000);
  });

  it("asks for a real differentiator instead of selecting immediately from a broad pool", async () => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    let state = createV3ConversationState("fair-selection");
    for (const [id, message] of [["1", "Şehir içinde kullanmak için SUV araç almak istiyorum"], ["2", "Özel park donanımı şart değil"], ["3", "Kesin bütçem 2 milyon TL"], ["4", "Elektrikli olsun"]] as const) state = (await turn(state, id, message)).state;
    const output = await turn(state, "5", "Tek araç seçelim");
    expect(output.offerAwaitingConsent).not.toBe(true);
    expect(output.state.lastQuestionKey).toBe("decisionDifferentiator");
    expect(output.message).toMatch(/Seçimi yalnız fiyata bırakmayalım/iu);
  });
});
