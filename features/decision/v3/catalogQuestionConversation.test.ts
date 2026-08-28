import { afterEach, describe, expect, it } from "vitest";
import { createV3ConversationState, runV3Turn } from "./engine.server";

const previous = process.env.CARS_V31_PROVIDER_DISABLED;
afterEach(() => { if (previous === undefined) delete process.env.CARS_V31_PROVIDER_DISABLED; else process.env.CARS_V31_PROVIDER_DISABLED = previous; });

describe("V3 catalog questions inside an active decision conversation", () => {
  it("answers the school-service maximum-capacity question before resuming discovery", async () => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    let state = createV3ConversationState("school-service-catalog-question");
    let output = await runV3Turn({ conversationId: state.conversationId, messageId: "1", message: "Bütçemi karar filtresi olarak kullan. Kesin bütçe üst sınırım 5.000.000 TL.", expectedRevision: 0, state });
    state = output.state;
    output = await runV3Turn({ conversationId: state.conversationId, messageId: "2", message: "Okul servisçiliği yapıyorum. Mevcut aracım eskidi, sıfır bir araç almak istiyorum. Maksimum koltuk sayısına sahip olsun.", expectedRevision: state.revision, state });
    state = output.state;
    expect(state.lastQuestionKey).toBe("passengerCapacity");
    output = await runV3Turn({ conversationId: state.conversationId, messageId: "3", message: "En fazla kaç kişilik araç var?", expectedRevision: state.revision, state });
    expect(output.state.lastRoute).toBe("AUTOMOTIVE_INFORMATION");
    expect(output.message).toMatch(/en yüksek kapasite.*sürücü dahil \d+ kişi/iu);
    expect(output.message).toMatch(/örnek/iu);
    expect(output.message).not.toMatch(/Günlük kullanımına uygun araç yapısını/iu);
    expect(output.state.lastQuestionKey).toBe("bodyStyle");
  });

  it.each([
    ["Hangi yakıt türleri var?", /yakıt seçenekleri/iu],
    ["Kaç farklı model var?", /farklı marka-model/iu],
    ["En uzun elektrikli menzil kaç km?", /elektrikli menzil/iu],
    ["En yüksek taşıma kapasitesi kaç kilo?", /taşıma kapasitesi/iu],
  ])("answers %s without turning the question into a preference", async (message, expected) => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    let state = createV3ConversationState(`catalog-${message}`);
    state = (await runV3Turn({ conversationId: state.conversationId, messageId: "1", message: "Sıfır araç almak istiyorum.", expectedRevision: 0, state })).state;
    const ledgerBefore = state.ledger;
    const output = await runV3Turn({ conversationId: state.conversationId, messageId: "2", message, expectedRevision: state.revision, state });
    expect(output.message).toMatch(expected);
    expect(output.state.ledger).toEqual(ledgerBefore);
  });
});
