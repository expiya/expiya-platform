import { afterEach, describe, expect, it } from "vitest";
import { activeDecisionPreferences, applyPreferenceMessage, latestActiveLedgerEvent } from "./ledger";
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

  it("uses a hard budget only to filter and leaves ranking identical inside that pool", async () => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    let state = createV3ConversationState("budget-ranking");
    for (const [id, message] of [["1", "Şehir içinde SUV araç almak istiyorum"], ["2", "Kesin bütçem 2 milyon TL"]] as const) state = (await turn(state, id, message)).state;
    const catalog = await evaluateV3Catalog(state.ledger, undefined, "BUDGET_AS_DECISION_FILTER");
    const ranked = rankV3Candidates(catalog.variants, state.ledger, "BUDGET_AS_DECISION_FILTER");
    const needsRanked = rankV3Candidates(catalog.variants, state.ledger, "NEEDS_ONLY");
    expect(ranked.map((variant) => variant.id)).toEqual(needsRanked.map((variant) => variant.id));
    expect(ranked.every((variant) => !variant.activeNewPrice || variant.activeNewPrice.amountTry <= 2_000_000)).toBe(true);
  });

  it("does not ask for a second equipment differentiator after the user says equipment is not important", async () => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    let state = createV3ConversationState("fair-selection");
    let output;
    for (const [id, message] of [["1", "Şehir içinde kullanmak için SUV araç almak istiyorum"], ["2", "Özel park donanımı şart değil"], ["3", "Kesin bütçem 2 milyon TL"], ["4", "Elektrikli olsun"]] as const) { output = await turn(state, id, message); state = output.state; }
    expect(output?.offerAwaitingConsent).not.toBe(true);
    expect(output?.state.lastQuestionKey).toBe("brandModel");
    expect(output?.message).not.toMatch(/donanım.*vazgeçilmez/iu);
  });

  it("applies explicit and percentage budget corrections to the active ceiling", async () => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    let state = createV3ConversationState("budget-corrections");
    for (const [id, message] of [["1", "Bütçemi karar filtresi olarak kullan."], ["2", "Kesin bütçem 1.100.000 TL"], ["3", "Bütçeyi %10 artır"], ["4", "Bütçeyi 1.500.000'e çıkar"]] as const) state = (await turn(state, id, message)).state;
    expect(latestActiveLedgerEvent(state.ledger, "budgetMax")).toMatchObject({ normalizedValue: 1_500_000, decisionUse: "HARD_FILTER" });
    expect(state.budgetMetadata).toMatchObject({ amountTry: 1_500_000, includedInDecision: true });
  });

  it("treats both body choices as flexibility and does not repeat the body question", async () => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    const state = { ...createV3ConversationState("body-flexible"), purchaseIntent: "ACTIVE_DISCOVERY" as const, lastQuestionKey: "bodyStyle", askedQuestionKeys: ["primaryUsage", "bodyStyle"] };
    const applied = applyPreferenceMessage(state, "1", "Her ikisi de olabilir");
    expect(latestActiveLedgerEvent(applied.ledger, "bodyNotImportant")).toMatchObject({ normalizedValue: "FLEXIBLE", decisionUse: "NONE" });
  });

  it("explains when budget filter mode has no applied amount", async () => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    let state = createV3ConversationState("missing-budget-amount");
    state = (await turn(state, "1", "Bütçemi karar filtresi olarak kullan.")).state;
    const output = await turn(state, "2", "Bütçe zaten belirtmiştim.");
    expect(output.message).toMatch(/uygulanmış bir tutar görünmüyor/iu);
    expect(output.state.budgetMetadata).toBeUndefined();
    expect(output.state.lastQuestionKey).toBe("budget");
  });

  it("applies the UI budget control atomically and acknowledges the exact ceiling", async () => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    const output = await turn(createV3ConversationState("atomic-budget-control"), "1", "Bütçemi karar filtresi olarak kullan. Kesin bütçe üst sınırım 4.444.000 TL.");
    expect(output.state.budgetMode).toBe("BUDGET_AS_DECISION_FILTER");
    expect(output.state.budgetMetadata).toMatchObject({ amountTry: 4_444_000, includedInDecision: true });
    expect(output.message).toMatch(/4\.444\.000 TL kesin üst sınırını karar filtresine uyguladım/iu);
    expect(output.state.lastQuestionKey).toBeUndefined();
  });

  it("asks passenger capacity instead of repeating the stated usage", async () => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    const output = await turn(createV3ConversationState("passenger-transport"), "1", "Yolcu taşıma amaçlı araç arıyorum");
    expect(latestActiveLedgerEvent(output.state.ledger, "primaryUsage")).toMatchObject({ normalizedValue: "PASSENGER_TRANSPORT", decisionUse: "HARD_FILTER" });
    expect(output.state.lastQuestionKey).toBe("passengerCapacity");
    expect(output.message).toMatch(/sürücü dahil.*toplam kaç kişi/iu);
    expect(output.message).not.toMatch(/nerede ve ne için kullanacaksın/iu);
  });

  it("does not reveal an arbitrary Nissan variant while four eligible variants still have material differences", async () => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    let state = createV3ConversationState("nissan-four-candidates");
    let output;
    for (const [id, message] of [
      ["1", "Nissan modelleri ile ilgileniyorum"],
      ["2", "İşe gidiş ve aile yolculukları beraber"],
      ["3", "Ferah ve yüksek SUV"],
      ["4", "Hibrit veya elektrikli olabilir"],
      ["5", "Bana uygun aracı öner"],
    ] as const) { output = await turn(state, id, message); state = output.state; }
    const catalog = await evaluateV3Catalog(state.ledger);
    expect(catalog.variants.length).toBeGreaterThan(1);
    expect(output?.offerAwaitingConsent).not.toBe(true);
    expect(output?.state.pendingOffer).toBeUndefined();
    expect(output?.state.lastQuestionKey).toMatch(/^(?:verifiedEquipment|personaDiscriminator|technicalDiscriminator):/u);
    expect(output?.message).not.toMatch(/tek seçimi hazırladım|Göstermemi ister misin/iu);
  });
});
