import { afterEach, describe, expect, it } from "vitest";
import { activeDecisionPreferences, latestActiveLedgerEvent } from "./ledger";
import { createV3ConversationState, runV3Turn } from "./engine.server";
import { interpretV31Message } from "./semanticProvider.server";

const priorDisabled = process.env.CARS_V31_PROVIDER_DISABLED;
afterEach(() => { if (priorDisabled === undefined) delete process.env.CARS_V31_PROVIDER_DISABLED; else process.env.CARS_V31_PROVIDER_DISABLED = priorDisabled; });

describe("V3.7 whole-message interpretation", () => {
  const message = "Sürücü ehliyetimi bugün aldım, heyecanlıyım. İlk aracımı almak için araştırma yapıyorum.";

  it("provides structured intent, acts and human context to the decision engine", async () => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    const interpretation = await interpretV31Message({ message, hasPurchaseIntent: false, hasOpenQuestion: false });
    expect(interpretation.router).toMatchObject({ version: "3.8", route: "PURCHASE_INTENT_DISCOVERY" });
    expect(interpretation.purchaseIntentAssessment).toBe("EXPLICIT");
    expect(interpretation.messageActs).toContain("VEHICLE_PURCHASE_INTENT");
    expect(interpretation.contextSignals.map((item) => item.kind)).toEqual(expect.arrayContaining(["FIRST_TIME_DRIVER", "PURCHASE_RESEARCH"]));
    expect(interpretation.contextSignals.every((item) => message.slice(item.sourceSpan.start, item.sourceSpan.end) === item.sourceSpan.text)).toBe(true);
  });

  it("responds to the whole message and enters discovery without inventing a preference", async () => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    const output = await runV3Turn({ conversationId: "first-driver", messageId: "1", message, expectedRevision: 0, state: createV3ConversationState("first-driver") });
    expect(output.message).toMatch(/Tebrik ederim.*ehliyetini alıp ilk aracını araştırmaya başlamak.*heyecanlı/iu);
    expect(output.message).toMatch(/nerede ve ne için/iu);
    expect(output.message).not.toMatch(/Merhaba|Nasıl gidiyor/iu);
    expect(output.state.purchaseIntent).toBe("EXPLICIT");
    expect(output.state.lastQuestionKey).toBe("primaryUsage");
    expect(latestActiveLedgerEvent(output.state.ledger, "firstTimeDriverContext")).toMatchObject({ decisionUse: "NONE" });
    expect(activeDecisionPreferences(output.state.ledger)).toHaveLength(0);
  });

  it("keeps a new-parent conversation family-aware and repairs a rejected generic example", async () => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    let output = await runV3Turn({
      conversationId: "new-parent-family",
      messageId: "1",
      message: "Bebeğimiz oldu. Eşim ve ben bir araba almaya karar verdik.",
      expectedRevision: 0,
    });
    expect(output.message).toMatch(/Tebrik ederim/iu);
    expect(output.message).toMatch(/Yeni aile düzeninizde/iu);
    expect(output.message).not.toMatch(/yük taşıma/iu);
    expect(latestActiveLedgerEvent(output.state.ledger, "newParentContext")).toMatchObject({ decisionUse: "NONE" });
    expect(latestActiveLedgerEvent(output.state.ledger, "primaryUsage")).toBeUndefined();

    output = await runV3Turn({
      conversationId: "new-parent-family",
      messageId: "2",
      message: "Aile arabası istiyorum. Yük taşıma nereden çıktı böyle?",
      expectedRevision: 1,
      state: output.state,
    });
    expect(latestActiveLedgerEvent(output.state.ledger, "primaryUsage")).toMatchObject({ normalizedValue: "FAMILY" });
    expect(output.message).toMatch(/yalnız genel bir örnek.*kararına kaydedilmedi.*Aile kullanımını esas alıyorum/iu);
    expect(latestActiveLedgerEvent(output.state.ledger, "cargoRequirement")).toBeUndefined();
  });
});
