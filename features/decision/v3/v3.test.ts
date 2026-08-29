import { describe, expect, it } from "vitest";
import { activeDecisionPreferences } from "./ledger";
import { routeConversationMessage } from "./router";
import { createV3ConversationState, runV3Turn } from "./engine.server";
import { runStoredV31Turn, resetV31StoreForTests } from "./store.server";
import { createRecommendationTermsAcceptance } from "@/lib/legal/recommendationTerms";
import { advanceV3ToOffer } from "./testConversationDecision";

describe("Cars Conversation Decision Flow V3", () => {
  it.each([
    ["Merhaba", "SOCIAL_CONVERSATION"],
    ["Yarın okulda sınav var.", "OFF_TOPIC_REQUEST"],
    ["Dün akşamki maçı izledin mi?", "OFF_TOPIC_REQUEST"],
    ["Yeni telefon almalıyım; iPhone mu Samsung mu?", "OFF_TOPIC_REQUEST"],
    ["Bugün hava çok sıcak.", "OFF_TOPIC_REQUEST"],
    ["Önden çekiş ile arkadan itiş farkını bilmiyorum.", "AUTOMOTIVE_INFORMATION"],
    ["Toplu taşımadan yoruldum, araç almak istiyorum.", "PURCHASE_INTENT_DISCOVERY"],
  ])("routes %s", (message, expected) => expect(routeConversationMessage(message, { hasPurchaseIntent: false, hasOpenQuestion: false }).route).toBe(expected));

  it("does not mutate or evaluate the catalog for social/off-topic messages", () => {
    for (const message of ["Merhaba", "Yarın okulda sınav var.", "Bugün hava çok sıcak."]) {
      const result = routeConversationMessage(message, { hasPurchaseIntent: false, hasOpenQuestion: false });
      expect(result.decisionMutationAllowed).toBe(false); expect(result.catalogEvaluationRequired).toBe(false);
    }
  });

  it("keeps weak signals out of decision projection and confirms them append-only", async () => {
    let state = createV3ConversationState("weak");
    let output = await runV3Turn({ conversationId: "weak", messageId: "1", message: "Araç almak istiyorum", expectedRevision: 0, state }); state = output.state;
    output = await runV3Turn({ conversationId: "weak", messageId: "2", message: "Dört kişilik aileyiz, kamp yapıyoruz, bozuk yola gidiyoruz.", expectedRevision: 1, state }); state = output.state;
    expect(activeDecisionPreferences(state.ledger).map((item) => item.concept)).not.toContain("mixedRoadUse");
    expect(output.message).toMatch(/değerlendirelim mi/u);
    output = await runV3Turn({ conversationId: "weak", messageId: "3", message: "Evet, değerlendirelim", expectedRevision: 2, state });
    expect(activeDecisionPreferences(output.state.ledger).map((item) => item.concept)).toContain("mixedRoadUse");
  });

  it("supersedes body style, clears budget, and permits universe expansion", async () => {
    let state = createV3ConversationState("change");
    for (const [id, message] of [["1", "Araç almak istiyorum"], ["2", "SUV olsun."], ["3", "Vazgeçtim, hatchback de olabilir."], ["4", "Bütçem maksimum 3 milyon"], ["5", "Bütçeyi kaldır"]] as const) {
      const output = await runV3Turn({ conversationId: "change", messageId: id, message, expectedRevision: state.revision, state }); state = output.state;
    }
    const projected = activeDecisionPreferences(state.ledger);
    expect(projected.find((item) => item.concept === "bodyStyle")?.normalizedValue).toBe("HATCHBACK");
    expect(projected.find((item) => item.concept === "budgetMax")).toBeUndefined();
  });

  it("is idempotent and rejects message-id payload changes", async () => {
    const state = createV3ConversationState("replay");
    const first = await runV3Turn({ conversationId: "replay", messageId: "same", message: "Merhaba", expectedRevision: 0, state });
    const replay = await runV3Turn({ conversationId: "replay", messageId: "same", message: "Merhaba", expectedRevision: 1, state: first.state });
    expect(replay.state).toEqual(first.state);
    await expect(runV3Turn({ conversationId: "replay", messageId: "same", message: "Başka", expectedRevision: 1, state: first.state })).rejects.toThrow("V3_MESSAGE_PAYLOAD_CONFLICT");
  });

  it("does not ask transmission after BEV and does not leak between states", async () => {
    const a = await runV3Turn({ conversationId: "a", messageId: "1", message: "Küçük elektrikli araç almak istiyorum", expectedRevision: 0 });
    expect(a.message.toLocaleLowerCase("tr")).not.toContain("şanzıman");
    const b = createV3ConversationState("b");
    expect(activeDecisionPreferences(b.ledger)).toHaveLength(0);
  });

  it("holds recommendations until signed offer consent and rejects a forged token", async () => {
    let output = await runV3Turn({ conversationId: "offer", messageId: "1", message: "Yeni araç almak istiyorum", expectedRevision: 0 });
    for (const [id, message] of [["2", "Şehir içinde günlük kullanacağım"], ["3", "Parkı kolay kompakt hatchback olsun"], ["4", "Kesin bütçem 3 milyon TL"], ["5", "Elektrikli olsun"], ["6", "Geri görüş kamerası kesin olsun"], ["7", "Tek araç öner"]] as const) output = await runV3Turn({ conversationId: "offer", messageId: id, message, expectedRevision: output.state.revision, state: output.state });
    output = await advanceV3ToOffer(output, "offer-discriminator");
    expect(output.recommendations).toBeUndefined(); expect(output.offerAwaitingConsent).toBe(true);
    const forged = { ...output.state, pendingOffer: { ...output.state.pendingOffer!, token: `${output.state.pendingOffer!.token}x` } };
    await expect(runV3Turn({ conversationId: "offer", messageId: "missing-terms", message: "Evet, göster", expectedRevision: output.state.revision, state: output.state })).rejects.toThrow("V3_RECOMMENDATION_TERMS_REQUIRED");
    await expect(runV3Turn({ conversationId: "offer", messageId: "8", message: "Evet, göster", expectedRevision: forged.revision, state: forged, recommendationTermsAcceptance: createRecommendationTermsAcceptance() })).rejects.toThrow("V31_OFFER_UNAUTHORIZED");
    const revealed = await runV3Turn({ conversationId: "offer", messageId: "8", message: "Evet, göster", expectedRevision: output.state.revision, state: output.state, recommendationTermsAcceptance: createRecommendationTermsAcceptance() });
    expect(revealed.recommendations).toHaveLength(1); expect(revealed.state.pendingOffer).toBeUndefined();
    expect(revealed.recommendations?.[0]?.decisionInsight).toMatchObject({ rank: 1, eligibleCount: expect.any(Number), leadingCandidateCount: expect.any(Number), decisivePreferences: expect.any(Array) });
    expect(revealed.state.recommendationTermsAcceptance).toMatchObject({ version: "REC-2026.08-v1.1", offerId: output.state.pendingOffer?.offerId });
  });

  it("keeps server state authoritative and replays byte-equivalent output", async () => {
    resetV31StoreForTests(); const run = (message: string, messageId: string, expectedRevision: number) => runStoredV31Turn({ conversationId: "stored", messageId, message, expectedRevision, run: (state) => runV3Turn({ conversationId: "stored", messageId, message, expectedRevision, state }) });
    const first = await run("Merhaba", "m1", 0); const replay = await run("Merhaba", "m1", 0); expect(replay).toEqual(first);
    await expect(run("Başka içerik", "m1", 1)).rejects.toThrow("V3_MESSAGE_PAYLOAD_CONFLICT");
    await expect(run("Yeni mesaj", "m2", 0)).rejects.toThrow("V3_REVISION_CONFLICT");
  });
});
