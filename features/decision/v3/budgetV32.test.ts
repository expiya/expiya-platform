import { describe, expect, it } from "vitest";
import { activeDecisionPreferences, latestActiveLedgerEvent } from "./ledger";
import { createV3ConversationState, runV3Turn } from "./engine.server";
import type { V3ConversationState } from "./types";
import { createRecommendationTermsAcceptance } from "@/lib/legal/recommendationTerms";

async function turn(state: V3ConversationState, message: string, id: string) { return runV3Turn({ conversationId: state.conversationId, messageId: id, message, expectedRevision: state.revision, state }); }

describe("V3.2 budget timing and authority", () => {
  it("keeps needs-only discovery on structural and verified equipment needs", async () => {
    let state = createV3ConversationState("budget-order"); let output = await turn(state, "Araç almak istiyorum", "1"); state = output.state;
    expect(output.message).toMatch(/nerede ve ne için/iu);
    output = await turn(state, "Şehir içinde günlük kullanacağım", "2"); state = output.state; expect(output.message).toMatch(/Park kolaylığı mı/iu);
    output = await turn(state, "Özel bir donanım şart değil", "3"); state = output.state;
    output = await turn(state, "Daha ferah ve yüksek olsun", "4");
    expect(output.state.lastQuestionKey).toBe("fuelType");
    expect(activeDecisionPreferences(output.state.ledger).filter((item) => ["primaryUsage", "bodyStyle"].includes(item.concept)).every((item) => item.decisionUse === "HARD_FILTER")).toBe(true);
  });

  it("stores approximate budget as soft rank and exact ceiling as hard filter", async () => {
    let state = createV3ConversationState("budget-strength");
    for (const [id, message] of [["1", "Şehir içinde kullanmak için SUV araç almak istiyorum"], ["2", "Yaklaşık 2 milyon civarı"]] as const) { const output = await turn(state, message, id); state = output.state; }
    expect(latestActiveLedgerEvent(state.ledger, "budgetTarget")).toMatchObject({ decisionUse: "SOFT_RANK", normalizedValue: 2_000_000 });
    expect(latestActiveLedgerEvent(state.ledger, "budgetMax")).toBeUndefined();
    const exact = await turn(state, "Kesin üst sınırım 2 milyon 300 bin TL", "3");
    expect(latestActiveLedgerEvent(exact.state.ledger, "budgetMax")).toMatchObject({ decisionUse: "HARD_FILTER", normalizedValue: 2_300_000 });
  });

  it("asks for an exact ceiling after other filter questions are exhausted", async () => {
    let state: V3ConversationState = { ...createV3ConversationState("exact-last"), budgetMode: "BUDGET_AS_DECISION_FILTER" }; let output;
    for (const [id, message] of [["1", "Şehir içinde kullanmak için SUV araç almak istiyorum"], ["2", "Yaklaşık 3 milyon civarı"], ["3", "Benzinli olsun"]] as const) { output = await turn(state, message, id); state = output.state; }
    expect(output!.message).toMatch(/kesin bütçe üst sınırı/iu);
  });

  it("uses brand/model once when budget is irrelevant, then prepares three value choices", async () => {
    let state = createV3ConversationState("value-three"); let output;
    for (const [id, message] of [["1", "Aile kullanımı için SUV araç almak istiyorum"], ["2", "Bütçe sorun değil"], ["3", "Benzinli olsun"]] as const) { output = await turn(state, message, id); state = output.state; }
    expect(output!.state.lastQuestionKey).toMatch(/^verifiedEquipment:/u);
    for (const id of ["4", "5", "6"]) { if (state.lastQuestionKey === "brandModel") break; output = await turn(state, "Bu gruptakilerden hiçbiri şart değil", id); state = output.state; }
    expect(output!.message).toMatch(/Marka veya model/iu);
    output = await turn(state, "Fark etmez, sen seç", "7"); expect(output.offerAwaitingConsent).toBe(true); expect(output.state.pendingOffer?.candidateIds.length).toBeLessThanOrEqual(3);
    output = await runV3Turn({ conversationId: output.state.conversationId, messageId: "8", message: "Evet, göster", expectedRevision: output.state.revision, state: output.state, recommendationTermsAcceptance: createRecommendationTermsAcceptance() }); expect(output.recommendations?.length).toBeGreaterThan(0); expect(output.recommendations?.length).toBeLessThanOrEqual(3);
  });
});
