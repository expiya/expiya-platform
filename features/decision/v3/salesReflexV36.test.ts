import { afterEach, describe, expect, it } from "vitest";
import { activeDecisionPreferences } from "./ledger";
import { createV3ConversationState, runV3Turn } from "./engine.server";

const priorDisabled = process.env.CARS_V31_PROVIDER_DISABLED;
afterEach(() => { if (priorDisabled === undefined) delete process.env.CARS_V31_PROVIDER_DISABLED; else process.env.CARS_V31_PROVIDER_DISABLED = priorDisabled; });

async function turn(state: ReturnType<typeof createV3ConversationState>, id: string, message: string) {
  return runV3Turn({ conversationId: state.conversationId, messageId: id, message, expectedRevision: state.revision, state });
}

describe("V3.6 professional sales reflex", () => {
  it("keeps context after an automotive answer and opens a low-pressure purchase-intent question", async () => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    let state = createV3ConversationState("sales-reflex");
    let output = await turn(state, "1", "Elektrikli araçlar normal araçlara göre daha pahalı sanırım?"); state = output.state;
    expect(output.message).toMatch(/satın alma fiyatı/iu); expect(state.purchaseIntent).toBe("NOT_EXPRESSED");
    output = await turn(state, "2", "Bilgi için teşekkür ederim.");
    expect(output.message).not.toMatch(/Merhaba|Nasıl gidiyor/iu);
    expect(output.message).toMatch(/yalnızca merak mı.*günlük kullanımın için değerlendirmeye açık mısın/iu);
    expect(output.state.lastQuestionKey).toBe("purchaseInterest");
    expect(output.state.purchaseIntent).toBe("NOT_EXPRESSED");
  });

  it("moves an affirmative answer directly into needs discovery", async () => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    let state = createV3ConversationState("sales-convert");
    for (const [id, message] of [["1", "Elektrikli araçlar benzinlilere göre daha pahalı mı?"], ["2", "Bilgi için teşekkürler"]] as const) state = (await turn(state, id, message)).state;
    const output = await turn(state, "3", "Evet, kendi kullanımım için değerlendirmeye açığım.");
    expect(output.state.purchaseIntent).toBe("EXPLICIT");
    expect(output.state.lastQuestionKey).toBe("primaryUsage");
    expect(output.message).toMatch(/nerede ve ne için/iu);
  });

  it("leaves pure curiosity decision-neutral when the user declines", async () => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    let state = createV3ConversationState("sales-decline");
    for (const [id, message] of [["1", "Elektrikli araçlar daha pahalı mı?"], ["2", "Teşekkür ederim"]] as const) state = (await turn(state, id, message)).state;
    const output = await turn(state, "3", "Sadece merak ettim, şimdilik düşünmüyorum.");
    expect(output.state.purchaseIntent).toBe("NOT_EXPRESSED");
    expect(activeDecisionPreferences(output.state.ledger)).toHaveLength(0);
    expect(output.state.lastQuestionKey).toBeUndefined();
  });
});
