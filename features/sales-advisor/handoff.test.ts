import { beforeEach, describe, expect, it } from "vitest";
import { runV3Turn } from "@/features/decision/v3/engine.server";
import { sealV31State } from "@/features/decision/v3/stateToken.server";
import { resetV31OffersForTests } from "@/features/decision/v3/offerGovernance.server";
import { createRecommendationTermsAcceptance } from "@/lib/legal/recommendationTerms";
import type { V3PublicResponse } from "@/features/decision/v3/types";
import { createPhase2Handoff, createPhase3IntentHandoff, openPhase2Experience, openPhase3IntentHandoff, publicSummary, resetPhase2HandoffsForTests } from "./handoff.server";
import type { PreferenceEvent } from "@/features/decision/v3/types";

const summaryEvent = (concept: string, normalizedValue: string | number): PreferenceEvent => ({ id: `event-${concept}`, sourceMessageId: "message-1", sourceTurn: 1, sourceSpan: { start: 0, end: 1, text: "x" }, concept, normalizedValue, strength: "EXPLICIT_STRONG", status: "ACTIVE", decisionUse: "NONE", confidence: 1, authority: "USER_EXPLICIT", confirmationRequired: false });

async function revealed(conversationId: string) {
  let output: V3PublicResponse | undefined;
  for (const [index, message] of ["Yeni araç almak istiyorum", "Şehir içinde günlük kullanacağım", "Parkı kolay hatchback olsun", "Kesin bütçem 3 milyon TL", "Elektrikli olsun", "Geri görüş kamerası kesin olsun", "Tek araç öner", "Evet, göster"].entries()) output = await runV3Turn({ conversationId, messageId: `${conversationId}-${index}`, message, expectedRevision: output?.state.revision ?? 0, state: output?.state, ...(output?.state.pendingOffer ? { recommendationTermsAcceptance: createRecommendationTermsAcceptance() } : {}) });
  return output!;
}

describe("signed phase 2 handoff", () => {
  beforeEach(() => { resetV31OffersForTests(); resetPhase2HandoffsForTests(); });
  it("accepts a revealed exact variant, is idempotent and leaves phase 1 state unchanged", async () => {
    const output = await revealed("phase2-valid"); const before = JSON.stringify(output.state); const selected = output.recommendations![0]!.id; const input = { conversationId: output.state.conversationId, stateToken: sealV31State(output.state), offerId: output.state.recommendationTermsAcceptance!.offerId, selectedExactVariantId: selected };
    const first = await createPhase2Handoff(input); const replay = await createPhase2Handoff(input); expect(replay.token).toBe(first.token);
    const opened = await openPhase2Experience(first.token); expect(opened.artifact.exactVariantId).toBe(selected); expect(opened.handoff.decisionFingerprint).toMatch(/^[a-f0-9]{64}$/u); const summaries = opened.handoff.approvedNeeds.map((item) => item.summary).join(" "); expect(summaries).not.toMatch(/URBAN_DAILY|HATCHBACK|BEV|REAR_VIEW_CAMERA/u); expect(JSON.stringify(output.state)).toBe(before);
    const phase3 = await createPhase3IntentHandoff({ phase2Token: first.token, intent: "REQUEST_TEST_DRIVE" }); expect(phase3).toMatchObject({ status: "HANDOFF_READY", executionAuthorized: false, intent: "REQUEST_TEST_DRIVE" });
    const phase3Opened = await openPhase3IntentHandoff(phase3.token, "REQUEST_TEST_DRIVE"); expect(phase3Opened.handoff.selectedExactVariantId).toBe(selected); await expect(openPhase3IntentHandoff(phase3.token, "REQUEST_QUOTE")).rejects.toThrow("INTENT_MISMATCH"); await expect(openPhase3IntentHandoff(`${phase3.token}x`)).rejects.toThrow("TAMPERED"); await expect(openPhase3IntentHandoff(phase3.token, undefined, new Date(Date.now() + 31 * 60_000))).rejects.toThrow("STALE"); expect(JSON.stringify(output.state)).toBe(before);
  }, 30_000);
  it("turns internal transmission, seat and equipment values into natural Turkish", () => {
    expect(publicSummary(summaryEvent("transmission", "AUTOMATIC"))).toBe("Şanzıman tercihi: otomatik");
    expect(publicSummary(summaryEvent("minimumSeats", 2))).toBe("Kullanım kapasitesi: en az 2 kişi");
    expect(publicSummary(summaryEvent("equipmentNotImportant", "MINIMAL"))).toBe("Ek donanım şartı: başka bir donanım zorunlu değil");
  });
  it("rejects tampering, cross-conversation binding and expiry", async () => {
    const output = await revealed("phase2-reject"); const selected = output.recommendations![0]!.id; const valid = await createPhase2Handoff({ conversationId: output.state.conversationId, stateToken: sealV31State(output.state), offerId: output.state.recommendationTermsAcceptance!.offerId, selectedExactVariantId: selected });
    await expect(openPhase2Experience(`${valid.token}x`)).rejects.toThrow("TAMPERED"); await expect(createPhase2Handoff({ conversationId: "other", stateToken: sealV31State(output.state), offerId: output.state.recommendationTermsAcceptance!.offerId, selectedExactVariantId: selected })).rejects.toThrow("NOT_REVEALED"); await expect(openPhase2Experience(valid.token, new Date(Date.now() + 25 * 60 * 60_000))).rejects.toThrow("STALE");
  }, 30_000);
});
