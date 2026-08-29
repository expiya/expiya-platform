import { afterEach, describe, expect, it } from "vitest";
import { createV3ConversationState, runV3Turn } from "./engine.server";
import { evaluateV3Catalog } from "./catalogAdapter.server";

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

  it("treats a follow-up request for the highest passenger capacity as a decision instruction", async () => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    let state = createV3ConversationState("school-service-maximum-capacity-decision");
    let output = await runV3Turn({
      conversationId: state.conversationId,
      messageId: "1",
      message: "Öğrenci taşımacılığı yapıyorum. Mevcut aracımın kapasitesi yeterli değil. En yüksek kapasiteli aracı arıyorum.",
      expectedRevision: 0,
      state,
    });
    state = output.state;
    expect(state.lastQuestionKey).toBe("passengerCapacity");

    output = await runV3Turn({
      conversationId: state.conversationId,
      messageId: "2",
      message: "Sen bana en yüksek kapasiteli araç hangisi ise onu göster.",
      expectedRevision: state.revision,
      state,
    });

    expect(output.state.ledger).toEqual(expect.arrayContaining([
      expect.objectContaining({ concept: "candidateSeatsPriority", normalizedValue: "MAXIMIZE", decisionUse: "SOFT_RANK" }),
    ]));
    expect(output.message).not.toMatch(/Günlük kullanımına uygun araç yapısını/iu);
    expect(output.state.lastQuestionKey).not.toBe("bodyStyle");
    const catalog = await evaluateV3Catalog(output.state.ledger);
    const maximumSeats = Math.max(...catalog.variants.flatMap((variant) => variant.decisionFacts.dimensions.seats ? [variant.decisionFacts.dimensions.seats.value] : []));
    const offered = catalog.variants.filter((variant) => output.state.pendingOffer?.candidateIds.includes(variant.id));
    expect(offered.length).toBeGreaterThan(0);
    expect(offered.every((variant) => variant.decisionFacts.dimensions.seats?.value === maximumSeats)).toBe(true);
  });

  it.each([
    ["En yüksek menzilli elektrikli aracı göster", "candidateRangePriority"],
    ["En yüksek taşıma kapasiteli aracı öner", "candidatePayloadPriority"],
    ["En düşük tüketimli aracı seç", "candidateConsumptionPriority"],
  ])("projects a direct catalog extreme into ranking: %s", async (message, concept) => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    const state = createV3ConversationState(`catalog-extreme-${concept}`);
    const output = await runV3Turn({
      conversationId: state.conversationId,
      messageId: "1",
      message,
      expectedRevision: 0,
      state,
    });
    expect(output.state.ledger).toEqual(expect.arrayContaining([
      expect.objectContaining({ concept, decisionUse: "SOFT_RANK" }),
    ]));
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

  it("answers an electric range purchase request before continuing discovery", async () => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    const state = createV3ConversationState("catalog-electric-range-request");
    const output = await runV3Turn({
      conversationId: state.conversationId,
      messageId: "1",
      message: "En yüksek menzile sahip elektrikli aracı satın almak istiyorum",
      expectedRevision: 0,
      state,
    });
    expect(output.message).toMatch(/en yüksek elektrikli menzil/iu);
    expect(output.message).toMatch(/Araç kartını göstermemi ister misin/iu);
    expect(output.state.pendingOffer?.candidateIds.length).toBeGreaterThan(0);
    expect(output.state.purchaseIntent).not.toBe("NOT_EXPRESSED");
  });
});
