import { afterEach, describe, expect, it } from "vitest";
import { createV3ConversationState, runV3Turn } from "./engine.server";
import { evaluateV3Catalog } from "./catalogAdapter.server";

const previous = process.env.CARS_V31_PROVIDER_DISABLED;
afterEach(() => { if (previous === undefined) delete process.env.CARS_V31_PROVIDER_DISABLED; else process.env.CARS_V31_PROVIDER_DISABLED = previous; });

describe("V3 catalog questions inside an active decision conversation", () => {
  it("welcomes a playful dream-car opener before asking for purchase intent", async () => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    const output = await runV3Turn({
      conversationId: "dream-car-opener",
      messageId: "1",
      message: "Hayalimdeki aracı tahmin edebilir misin?",
      expectedRevision: 0,
    });
    expect(output.message).toMatch(/kişisel bir hayal/iu);
    expect(output.state.lastQuestionKey).toBe("purchaseInterest");
  });

  it("responds empathetically to an automotive childhood dream", async () => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    const output = await runV3Turn({
      conversationId: "mustang-childhood-dream",
      messageId: "1",
      message: "Ben çocukken bir Mustang hayalim vardı.",
      expectedRevision: 0,
    });
    expect(output.message).toMatch(/otomobiller yalnız bir model olarak kalmıyor/iu);
    expect(output.message).toMatch(/sende de özel bir karşılığı/iu);
    expect(output.message).toMatch(/onu biraz konuşmak mı istersin/iu);
    expect(output.message).not.toBe("Merhaba! Nasıl yardımcı olabilirim?");
    expect(output.state.lastQuestionKey).toBe("purchaseInterest");
  });

  it.each([
    "Küçükken bir Porsche sahibi olmayı hep hayal ederdim.",
    "Yıllardır gönlümde özel bir otomobil var.",
  ])("recognizes automotive aspiration without a model-specific response: %s", async (message) => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    const output = await runV3Turn({
      conversationId: `general-affect-${message.length}`,
      messageId: "1",
      message,
      expectedRevision: 0,
    });
    expect(output.message).toMatch(/kişisel bir hayal|geçmişiyle ve hayalleriyle bağ/iu);
    expect(output.message).toMatch(/biraz konuşmak mı istersin/iu);
    expect(output.state.lastQuestionKey).toBe("purchaseInterest");
  });

  it("acknowledges aspiration while continuing an explicit purchase flow", async () => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    const output = await runV3Turn({
      conversationId: "aspirational-purchase",
      messageId: "1",
      message: "Bir gün hayalimdeki arabaya sahip olmak istiyorum.",
      expectedRevision: 0,
    });
    expect(output.message).toMatch(/Hayalindeki otomobil hissini kaybetmeden/iu);
    expect(output.message).toMatch(/Aracı daha çok nerede ve ne için kullanacaksın/iu);
    expect(output.state.lastQuestionKey).toBe("primaryUsage");
  });

  it("resolves a cultural vehicle reference before generic discovery", async () => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    const output = await runV3Turn({
      conversationId: "bumblebee-reference",
      messageId: "1",
      message: "Transformers filmindeki Bumblebee aracını istiyorum.",
      expectedRevision: 0,
    });
    expect(output.message).toMatch(/güçlü ve karakterli bir otomobil referansı/iu);
    expect(output.message).toMatch(/Chevrolet Camaro/iu);
    expect(output.message).toMatch(/Bu araç hakkında bilgi mi almak istersin/iu);
    expect(output.message).not.toMatch(/Birebir marka-model mi önemli/iu);
    expect(output.message).not.toMatch(/Aracı daha çok nerede ve ne için kullanacaksın/iu);
    expect(output.state.lastQuestionKey).toBe("unavailableReferenceChoice");
    expect(output.state.pendingVehicleReference).toMatchObject({ kind: "POP_CULTURE", ambiguity: "MULTIPLE_VEHICLES" });
  });

  it("does not offer an exact unavailable model and still handles a typed exact request", async () => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    let output = await runV3Turn({
      conversationId: "transformers-yellow-reference",
      messageId: "1",
      message: "Transformers filmindeki sarı araçtan almak istiyorum.",
      expectedRevision: 0,
    });
    expect(output.message).toMatch(/Chevrolet Camaro/iu);
    expect(output.state.lastQuestionKey).toBe("unavailableReferenceChoice");
    output = await runV3Turn({
      conversationId: output.state.conversationId,
      messageId: "2",
      message: "Birebir marka ve model önemli",
      expectedRevision: output.state.revision,
      state: output.state,
    });
    expect(output.message).toMatch(/Birebir referansın Chevrolet Camaro/iu);
    expect(output.message).toMatch(/aktif Türkiye sıfır kilometre kataloğunda bulunmuyor/iu);
    expect(output.message).toMatch(/yalnızca bu araç hakkında bilgi|benzer güncel sıfır araçları/iu);
    expect(output.message).not.toMatch(/Aracı daha çok nerede ve ne için kullanacaksın/iu);
    expect(output.state.lastQuestionKey).toBe("unavailableReferenceChoice");
  });

  it("answers an out-of-catalog model question and reopens purchase intent later", async () => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    let output = await runV3Turn({
      conversationId: "mustang-information-then-purchase",
      messageId: "1",
      message: "Çocukluk hayalim bir Mustang sahibi olmaktı.",
      expectedRevision: 0,
    });
    expect(output.state.lastQuestionKey).toBe("purchaseInterest");
    output = await runV3Turn({
      conversationId: output.state.conversationId,
      messageId: "2",
      message: "Şimdilik sadece merak ediyorum",
      expectedRevision: output.state.revision,
      state: output.state,
    });
    output = await runV3Turn({
      conversationId: output.state.conversationId,
      messageId: "3",
      message: "Mustang üretiliyor mu hâlâ?",
      expectedRevision: output.state.revision,
      state: output.state,
    });
    expect(output.message).toMatch(/üretilmeye devam ediyor/iu);
    expect(output.message).toMatch(/2026/iu);
    expect(output.message).toMatch(/aktif Türkiye sıfır kilometre kataloğunda yer almıyor/iu);
    output = await runV3Turn({
      conversationId: output.state.conversationId,
      messageId: "4",
      message: "Mustang almak istiyorum",
      expectedRevision: output.state.revision,
      state: output.state,
    });
    expect(output.state.purchaseIntent).not.toBe("ENDED_WITHOUT_INTENT");
    expect(output.message).toMatch(/Ford Mustang/iu);
    expect(output.message).toMatch(/aktif Türkiye sıfır kilometre kataloğunda bulunmuyor/iu);
    expect(output.message).not.toMatch(/Aracı daha çok nerede ve ne için kullanacaksın/iu);
  });

  it("responds to distress once and treats having no vehicle as context", async () => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    let output = await runV3Turn({
      conversationId: "distress-no-vehicle",
      messageId: "1",
      message: "Selam, çok dertliyim.",
      expectedRevision: 0,
    });
    expect(output.message).toMatch(/Canının sıkkın olduğu belli/iu);
    expect(output.message).not.toBe("Merhaba! Nasıl yardımcı olabilirim?");
    output = await runV3Turn({
      conversationId: output.state.conversationId,
      messageId: "2",
      message: "Arabam yok.",
      expectedRevision: output.state.revision,
      state: output.state,
    });
    expect(output.message).toMatch(/Araçsız olmanın günlük hayatı zorlaştırabildiğini/iu);
    expect(output.message).toMatch(/araç seçmene yardımcı olmamı ister misin/iu);
    expect(output.message).not.toBe("Merhaba! Nasıl yardımcı olabilirim?");
    expect(output.state.lastQuestionKey).toBe("purchaseInterest");
  });

  it("acknowledges a celebration without inventing its type in fallback", async () => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    const output = await runV3Turn({
      conversationId: "birthday-human-response",
      messageId: "1",
      message: "Bugün doğum günüm. 40 yaşına bastım.",
      expectedRevision: 0,
    });
    expect(output.message).toMatch(/Tebrik ederim/iu);
    expect(output.message).not.toMatch(/baba oldun|anne oldun/iu);
    expect(output.message).not.toBe("Merhaba! Nasıl yardımcı olabilirim?");
  });

  it("celebrates becoming a parent without calling it a birthday", async () => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    const output = await runV3Turn({
      conversationId: "new-parent-human-response",
      messageId: "1",
      message: "Bugün baba oldum.",
      expectedRevision: 0,
    });
    expect(output.message).toMatch(/Tebrik ederim/iu);
    expect(output.message).toMatch(/özel ve sevindirici bir gelişme/iu);
    expect(output.message).not.toMatch(/Doğum günün|Yeni yaşın/iu);
    expect(output.message).not.toBe("Merhaba! Nasıl yardımcı olabilirim?");
  });

  it("identifies a described talking film car before asking ordinary needs", async () => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    const output = await runV3Turn({
      conversationId: "kitt-described-reference",
      messageId: "1",
      message: "Ben çocukken bir film vardı. Araba konuşuyordu. Şoför ona 'hey kit' diye sesleniyordu; o araç neydi? Onu almak istiyorum.",
      expectedRevision: 0,
    });
    expect(output.message).toMatch(/Pontiac Firebird Trans Am/iu);
    expect(output.message).toMatch(/aktif Türkiye sıfır kilometre kataloğunda bulunmuyor/iu);
    expect(output.message).toMatch(/aynı karakteri taşıyan güncel sıfır araçları/iu);
    expect(output.message).not.toMatch(/Aracı daha çok nerede ve ne için kullanacaksın/iu);
    expect(output.state.lastQuestionKey).toBe("unavailableReferenceChoice");
  });

  it("answers conversational price wording instead of repeating the pending body question", async () => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    let output = await runV3Turn({ conversationId: "price-language", messageId: "1", message: "Bir araç almam gerekiyor ama çok param yok", expectedRevision: 0 });
    output = await runV3Turn({ conversationId: "price-language", messageId: "2", message: "Sizde araçlar kaç para?", expectedRevision: output.state.revision, state: output.state });
    expect(output.message).toMatch(/fiyatlar[\s\S]*TL'den başlayıp[\s\S]*TL'ye kadar/iu);
    expect(output.state.lastQuestionKey).toBeUndefined();
    output = await runV3Turn({ conversationId: "price-language", messageId: "3", message: "Bilmiyorum, hangisi daha ucuz?", expectedRevision: output.state.revision, state: output.state });
    expect(output.message).toMatch(/en düşük fiyat/iu);
    expect(output.message).not.toMatch(/Günlük kullanımına uygun araç yapısı|Park kolaylığı/iu);
  });
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
