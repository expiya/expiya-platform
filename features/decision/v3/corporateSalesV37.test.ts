import { afterEach, describe, expect, it } from "vitest";
import { activeDecisionPreferences, latestActiveLedgerEvent } from "./ledger";
import { createV3ConversationState, runV3Turn } from "./engine.server";

const priorDisabled = process.env.CARS_V31_PROVIDER_DISABLED;
afterEach(() => { if (priorDisabled === undefined) delete process.env.CARS_V31_PROVIDER_DISABLED; else process.env.CARS_V31_PROVIDER_DISABLED = priorDisabled; });
async function turn(state: ReturnType<typeof createV3ConversationState>, id: string, message: string) { return runV3Turn({ conversationId: state.conversationId, messageId: id, message, expectedRevision: state.revision, state }); }

describe("V3.7 corporate sales-team conversation", () => {
  it("models customer visits as corporate passenger travel rather than cargo-commercial use", async () => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    let state = createV3ConversationState("corporate-usage"); state = (await turn(state, "1", "Şirketimin satış departmanı için bir araç almak istiyorum.")).state;
    const output = await turn(state, "2", "Satış ekibim şehir içi ve şehir dışı müşteri ziyaretleri gerçekleştiriyor.");
    expect(activeDecisionPreferences(output.state.ledger).find((item) => item.concept === "primaryUsage")?.normalizedValue).toBe("CORPORATE_TRAVEL");
    expect(output.state.lastQuestionKey).toBe("fuelType");
  });

  it("accepts both cost dimensions and closes the pending confirmation instead of repeating", async () => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    let state = createV3ConversationState("both-costs");
    for (const [id, message] of [["1", "Şirketimin satış departmanı için bir araç almak istiyorum"], ["2", "Satış ekibim müşteri ziyaretleri için şehir içi ve şehir dışı kullanacak"], ["3", "Yakıt tasarrufu üst düzey olsun, donanımlar önemli değil"], ["4", "Ekonomik bir araç olsun yeterli"]] as const) state = (await turn(state, id, message)).state;
    expect(state.pendingConfirmation?.concept).toBe("valueEconomy");
    const output = await turn(state, "5", "Her ikisi de");
    expect(output.state.pendingConfirmation).toBeUndefined();
    expect(latestActiveLedgerEvent(output.state.ledger, "totalCostPriority")).toMatchObject({ normalizedValue: "TOTAL_COST", decisionUse: "SOFT_RANK" });
    expect(output.message).not.toMatch(/Satın alma fiyatını mı, kullanım giderlerini mi/iu);
    expect(output.state.lastQuestionKey).not.toBe("budget");
  });

  it("gives professional advice when asked and advances to budget", async () => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    let state = createV3ConversationState("advisor-cost");
    for (const [id, message] of [["1", "Şirketimin satış departmanı için bir araç almak istiyorum"], ["2", "Satış ekibim müşteri ziyaretleri için şehir içi ve şehir dışı kullanacak"], ["3", "Yakıt tasarrufu üst düzey olsun, donanımlar minimum kalsın"], ["4", "Ekonomik bir araç olsun yeterli"]] as const) state = (await turn(state, id, message)).state;
    const output = await turn(state, "5", "Bilmiyorum, sence hangisi daha önemli?");
    expect(output.message).toMatch(/toplam kullanım giderini biraz daha öne koymak mantıklı/iu);
    expect(output.message).toMatch(/Satın alma fiyatını da bütçe sınırı/iu);
    expect(output.state.pendingConfirmation).toBeUndefined();
    expect(output.state.lastQuestionKey).not.toBe("budget");
    expect((output.message.match(/\?/gu) ?? [])).toHaveLength(0);
  });
});
