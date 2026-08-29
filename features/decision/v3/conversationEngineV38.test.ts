import { afterEach, describe, expect, it } from "vitest";
import { runV3Turn } from "./engine.server";
import { routeConversationMessage } from "./router";
import { evaluateV3Catalog, resolveV3CatalogEntities } from "./catalogAdapter.server";
import { activeDecisionPreferences } from "./ledger";
import type { PreferenceEvent } from "./types";

const priorDisabled = process.env.CARS_V31_PROVIDER_DISABLED;
afterEach(() => { if (priorDisabled === undefined) delete process.env.CARS_V31_PROVIDER_DISABLED; else process.env.CARS_V31_PROVIDER_DISABLED = priorDisabled; });

describe("V3.8 corpus-derived conversation contracts", () => {
  it.each([
    "Cuma akşamı bagaja kamp malzemelerini atıp kaçmalık, arkasında yatılabilecek bir araba arıyorum.",
    "Bel fıtığım var, rahat ve sarsmayan bir araç lazım.",
    "Hafta sonu bisikletimi sökmeden atabileceğim bir araba bakıyorum.",
    "Virajlı yollarda sürüşü keyifli bir şey önerir misin?",
  ])("keeps a holistic vehicle search out of social and off-topic routes: %s", (message) => {
    expect(["PURCHASE_INTENT_DISCOVERY", "RECOMMENDATION_OR_OFFER"]).toContain(routeConversationMessage(message, { hasPurchaseIntent: false, hasOpenQuestion: false }).route);
  });

  it("preserves a daily-life need as a weak question input, never as an invented hard filter", async () => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    const output = await runV3Turn({ conversationId: "v38-ergonomics", messageId: "1", message: "Bel fıtığım var, koltuğu rahat ve süspansiyonu yumuşak bir araç lazım.", expectedRevision: 0 });
    expect(output.state.purchaseIntent).toBe("EXPLICIT");
    expect(output.state.ledger).toContainEqual(expect.objectContaining({ concept: "ergonomicComfort", strength: "WEAK_SIGNAL", decisionUse: "QUESTION_INPUT", authority: "USER_EXPLICIT" }));
    expect(output.state.ledger.some((item) => item.concept === "bodyStyle" || item.concept === "minimumSeats")).toBe(false);
  });

  it("keeps a confirmed non-catalog daily-life signal soft", async () => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    let output = await runV3Turn({ conversationId: "v38-cargo", messageId: "1", message: "Bisikletimi sökmeden taşıyabileceğim bir araba arıyorum.", expectedRevision: 0 });
    output = await runV3Turn({ conversationId: "v38-cargo", messageId: "2", message: "Evet, bagaj çok önemli.", expectedRevision: 1, state: output.state });
    expect(output.state.ledger).toContainEqual(expect.objectContaining({ concept: "cargoPracticality", strength: "CONFIRMED_STRONG", decisionUse: "SOFT_RANK" }));
    expect(output.state.ledger.some((item) => item.concept === "cargoPracticality" && item.decisionUse === "HARD_FILTER")).toBe(false);
  });

  it("accepts 'Yapalım' as confirmation and does not infer rough-road use from camping alone", async () => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    let output = await runV3Turn({ conversationId: "v38-natural-confirmation", messageId: "1", message: "Yetişkin çocuklarım arkada rahat etsin; arka koltuk diz mesafesi çok geniş sıfır sedan istiyorum.", expectedRevision: 0 });
    expect(output.state.pendingConfirmation?.concept).toBe("rearSeatSpace");
    output = await runV3Turn({ conversationId: "v38-natural-confirmation", messageId: "2", message: "Yapalım", expectedRevision: 1, state: output.state });
    expect(output.state.pendingConfirmation?.concept).not.toBe("rearSeatSpace");
    expect(output.state.ledger).toContainEqual(expect.objectContaining({ concept: "rearSeatSpace", strength: "CONFIRMED_STRONG", decisionUse: "SOFT_RANK" }));

    const camping = await runV3Turn({ conversationId: "v38-camping-not-offroad", messageId: "1", message: "Büyük çadır ve kamp ekipmanlarını taşıyacağım sıfır SUV istiyorum.", expectedRevision: 0 });
    expect(camping.state.pendingConfirmation?.concept).toBe("cargoPracticality");
    expect(camping.state.ledger.some((item) => item.concept === "mixedRoadUse")).toBe(false);
    expect(camping.message).not.toMatch(/bozuk yol/iu);
  });

  it("captures luggage practicality, avoids a false public-transport story, and keeps pending confirmation authoritative", async () => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    const message = "Uzun yolda valizleri sığdırmak için benzinli otomatik sedan alacağım. Donanım olarak elektrikli bagaj kapağı şart; kullanışlı geniş ve yüklemesi kolay bir bagaj istiyorum.";
    let output = await runV3Turn({ conversationId: "v38-luggage-trace", messageId: "1", message, expectedRevision: 0 });
    expect(output.state.pendingConfirmation?.concept).toBe("cargoPracticality");
    expect(output.message).toMatch(/Yükleme kolaylığı.*bagaj alanını/iu);
    output = await runV3Turn({ conversationId: "v38-luggage-trace", messageId: "2", message: "Göster", expectedRevision: 1, state: output.state });
    expect(output.state.pendingConfirmation?.concept).toBe("cargoPracticality");
    expect(output.offerAwaitingConsent).not.toBe(true);
    output = await runV3Turn({ conversationId: "v38-luggage-trace", messageId: "3", message: "Evet", expectedRevision: 2, state: output.state });
    expect(output.state.lastQuestionKey).toMatch(/^verifiedEquipment:|brandModel|offerConsent/u);
    expect(output.message).not.toMatch(/donanımları aday elemek veya sıralamak için kullanmadım/iu);

    const coachComfort = await runV3Turn({ conversationId: "v38-coach-metaphor", messageId: "1", message: "Uzun yolda otobüs konforu sunan sıfır crossover alacağım.", expectedRevision: 0 });
    expect(coachComfort.message).not.toMatch(/Toplu taşıma sabrını tüketmiş/iu);
  });

  it("acknowledges an explicit budget mode without manufacturing purchase readiness", async () => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    const output = await runV3Turn({ conversationId: "v38-budget-mode-copy", messageId: "1", message: "Bütçemi karar filtresi olarak kullan.", expectedRevision: 0 });
    expect(output.state.budgetMode).toBe("BUDGET_AS_DECISION_FILTER");
    expect(output.state.purchaseIntent).toBe("NOT_EXPRESSED");
    expect(output.state.lastQuestionKey).toBeUndefined();
    expect(output.message).toMatch(/yalnız uygun araçları elemek.*sırasını ihtiyaçların belirleyecek/iu);
    expect(output.message).not.toMatch(/en uygun aracı seçebilirim/iu);
  });

  it("processes a budget-mode choice and the complete vehicle request in the same turn", async () => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    const output = await runV3Turn({ conversationId: "v38-budget-composite", messageId: "1", message: "Bütçemi karar filtresi olarak kullan ve 1.850.000 TL sınırımı aşma. Ailem için panoramik cam tavanlı bir SUV satın almak istiyorum.", expectedRevision: 0 });
    expect(output.state.budgetMode).toBe("BUDGET_AS_DECISION_FILTER");
    expect(output.state.ledger).toEqual(expect.arrayContaining([
      expect.objectContaining({ concept: "budgetMax", normalizedValue: 1_850_000 }),
      expect.objectContaining({ concept: "primaryUsage", normalizedValue: "FAMILY" }),
      expect.objectContaining({ concept: "bodyStyle", normalizedValue: "SUV" }),
      expect.objectContaining({ concept: "equipmentFeature", normalizedValue: "PANORAMIC_GLASS_ROOF" }),
    ]));
    expect(output.message).not.toMatch(/Aradığın aracı anlatabilirsin/iu);
  });

  it("keeps an explicit panelvan singular and records several equipment requirements", async () => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    const output = await runV3Turn({ conversationId: "v38-commercial-budget", messageId: "1", message: "Bütçemi karar filtresi olarak kullan ve 2.500.000 TL sınırımı aşma. Dizel panelvan kamyonet alacağım; geri görüş kamerası, arka park sensörü ve şerit takip sistemi şart. Çift sürgülü yan kapı da olmalı.", expectedRevision: 0 });
    expect(output.state.ledger).toContainEqual(expect.objectContaining({ concept: "bodyStyle", normalizedValue: "PANEL VAN" }));
    const equipment = activeDecisionPreferences(output.state.ledger).filter((item) => item.concept === "equipmentFeature").map((item) => item.normalizedValue);
    expect(equipment).toEqual(expect.arrayContaining(["REAR_VIEW_CAMERA", "PARKING_SENSORS", "LANE_KEEP_ASSIST"]));
    expect(output.state.ledger).toContainEqual(expect.objectContaining({ concept: "unmappedEquipmentRequirement", normalizedValue: "çift sürgülü yan kapı", decisionUse: "NONE" }));
  });

  it.each([
    ["Selam, orada kimse var mı?", /Evet, buradayım.*nasıl yardımcı/iu],
    ["Merhabalar, müsait misiniz?", /Merhaba.*Nasıl yardımcı/iu],
    ["Selam dostum, nasılsın?", /Merhaba.*Nasıl yardımcı/iu],
  ])("keeps ordinary availability greetings social: %s", async (message, expected) => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    const output = await runV3Turn({ conversationId: `greeting:${message}`, messageId: "1", message, expectedRevision: 0 });
    expect(output.state.lastRoute).toBe("SOCIAL_CONVERSATION");
    expect(output.message).toMatch(expected);
  });

  it.each([
    ["Kredim onaylandı, 1.200.000 TL bütçeyle bugün araba seçmeye geldim.", 1_200_000],
    ["1.100.000 TL bütçeyle bugün bir araç bulalım.", 1_100_000],
    ["Bütçem 1.8M.", 1_800_000],
  ])("parses Turkish budget notation without truncation: %s", async (message, expected) => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    const output = await runV3Turn({ conversationId: `budget:${message}`, messageId: "1", message, expectedRevision: 0 });
    expect(output.state.ledger).toContainEqual(expect.objectContaining({ concept: "budgetMax", normalizedValue: expected }));
  });

  it("does not interpret a numeric budget range as a catalog model", async () => {
    const entities = await resolveV3CatalogEntities("600-700 bin TL arası şehir arabası arıyorum.");
    expect(entities.models).not.toContain("600");
  });

  it("resolves catalog model families without cross-brand contradictions", async () => {
    await expect(resolveV3CatalogEntities("Peugeot 5008 veya Skoda Kodiaq arıyorum")).resolves.toMatchObject({ brands: expect.arrayContaining(["Peugeot", "Škoda"]), models: expect.arrayContaining(["5008", "Kodiaq"]) });
    await expect(resolveV3CatalogEntities("BMW 3 Serisi arıyorum")).resolves.toMatchObject({ brands: ["BMW"], models: expect.arrayContaining(["320i Sedan"]) });
    await expect(resolveV3CatalogEntities("Dizel manuel Fiat Doblo arıyorum")).resolves.toMatchObject({ models: expect.arrayContaining(["Doblo", "Doblo Cargo"]) });
  });

  it("keeps persona signals decision-neutral and soft", async () => {
    const baseline = await evaluateV3Catalog([]);
    const preference = { id: "persona-design", sourceMessageId: "1", sourceTurn: 1, sourceSpan: { start: 0, end: 9, text: "karizmatik" }, concept: "distinctiveDesign", normalizedValue: "DISTINCTIVE_DESIGN", strength: "CONFIRMED_STRONG", status: "ACTIVE", decisionUse: "SOFT_RANK", confidence: 1, authority: "USER_CONFIRMED", confirmationRequired: false } satisfies PreferenceEvent;
    const withPersona = await evaluateV3Catalog([preference]);
    expect(withPersona.candidateIds).toEqual(baseline.candidateIds);
  });

  it("does not zero a relevant body-style pool when equipment evidence has no coverage in that pool", async () => {
    const preference = (concept: string, field: string, normalizedValue: string): PreferenceEvent => ({ id: concept, sourceMessageId: "1", sourceTurn: 1, sourceSpan: { start: 0, end: 1, text: "x" }, concept, field, normalizedValue, strength: "EXPLICIT_STRONG", status: "ACTIVE", decisionUse: "HARD_FILTER", confidence: 1, authority: "USER_EXPLICIT", confirmationRequired: false });
    const sedans = await evaluateV3Catalog([preference("bodyStyle", "bodyStyle", "SEDAN")]);
    const withUnsupportedSlidingDoor = await evaluateV3Catalog([preference("bodyStyle", "bodyStyle", "SEDAN"), preference("equipmentFeature", "equipmentFeature", "POWER_SLIDING_SIDE_DOOR")]);
    expect(withUnsupportedSlidingDoor.candidateIds).toEqual(sedans.candidateIds);
  });

  it.each([
    ["Uygun fiyatlı ticari araç seçenekleri arıyorum.", "COMMERCIAL"],
    ["4x4 bir arazi aracı bakıyorum.", "MIXED_ROAD"],
    ["Benzinli manuel, ayağımı yerden kesecek bir araç lazım.", "URBAN_DAILY"],
    ["İki çocukla sığamıyoruz; MPV veya büyük SUV alacağız.", "FAMILY"],
  ])("projects an already-stated usage instead of asking it again: %s", async (message, usage) => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    const output = await runV3Turn({ conversationId: `usage:${message}`, messageId: "1", message, expectedRevision: 0 });
    expect(output.state.ledger).toContainEqual(expect.objectContaining({ concept: "primaryUsage", normalizedValue: usage }));
    expect(output.state.lastQuestionKey).not.toBe("primaryUsage");
  });

  it.each([
    ["Dikkat çekici, farklı tasarımlı karizmatik bir araba istiyorum.", "distinctiveDesign"],
    ["Arka koltuk diz mesafesi çok geniş bir araç lazım.", "rearSeatSpace"],
    ["İçi uçak kokpiti gibi, ambiyans aydınlatmalı bir araç arıyorum.", "cockpitAmbience"],
  ])("preserves persona-like daily language as a weak signal: %s", async (message, concept) => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    const output = await runV3Turn({ conversationId: `signal:${message}`, messageId: "1", message, expectedRevision: 0 });
    expect(output.state.purchaseIntent).toBe("EXPLICIT");
    expect(output.state.ledger).toContainEqual(expect.objectContaining({ concept, strength: "WEAK_SIGNAL", decisionUse: "QUESTION_INPUT" }));
  });

  it("preserves an explicit charming-design request before generic equipment discovery", async () => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    const output = await runV3Turn({
      conversationId: "v38-charming-city-car",
      messageId: "1",
      message:
        "Merhaba, şehir içinde günlük kullanım için küçük bir araç istiyorum. Trafikte şirin modeller görüyorum ama markalarını bilmiyorum.",
      expectedRevision: 0,
    });
    expect(output.state.ledger).toContainEqual(
      expect.objectContaining({
        concept: "distinctiveDesign",
        strength: "WEAK_SIGNAL",
        decisionUse: "QUESTION_INPUT",
      }),
    );
    expect(output.state.pendingConfirmation?.concept).toBe(
      "distinctiveDesign",
    );
    expect(output.message).toMatch(/şirin.*karakterli görünüm/iu);
    expect(output.state.lastQuestionKey).not.toMatch(/Equipment/iu);
  });

  it("does not present the sole technical survivor as a verified charming-design match", async () => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    const messages = [
      "Şehir içinde küçük, şirin bir otomobil arıyorum.",
      "Evet, belirleyici olsun",
      "Kompakt hatchback",
      "Elektrikli veya hibrit olabilir",
      "Geri görüş kamerası, ön park sensörleri ve arka park sensörleri vazgeçilmez.",
    ];
    let output;
    for (const [index, message] of messages.entries())
      output = await runV3Turn({
        conversationId: "v38-charming-evidence-boundary",
        messageId: String(index + 1),
        message,
        expectedRevision: index,
        state: output?.state,
      });
    expect(output?.state.lastQuestionKey).toBe("designEvidenceBoundary");
    expect(output?.offerAwaitingConsent).not.toBe(true);
    expect(output?.message).toMatch(
      /tek bir aday.*doğrulayan onaylı tasarım verimiz yok/iu,
    );
  });

  it("treats an explicitly requested panoramic roof as equipment instead of asking about parking equipment", async () => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    const output = await runV3Turn({ conversationId: "explicit-panoramic-roof", messageId: "1", message: "Akşam sahilde panoramik cam tavandan gökyüzünü izleyebileceğimiz bir araba arıyorum.", expectedRevision: 0 });
    expect(output.state.ledger).toContainEqual(expect.objectContaining({ concept: "equipmentFeature", normalizedValue: "PANORAMIC_GLASS_ROOF", strength: "EXPLICIT_STRONG", decisionUse: "HARD_FILTER" }));
    expect(output.state.lastQuestionKey).not.toBe("parkingEquipment");
  });

  it("does not confuse electrical equipment with an electric powertrain", async () => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    const output = await runV3Turn({ conversationId: "diesel-electric-door", messageId: "1", message: "Dizel ve otomatik bir MPV istiyorum, donanımda elektrikli kayar kapı olmalı.", expectedRevision: 0 });
    expect(output.state.ledger).toContainEqual(expect.objectContaining({ concept: "fuelType", normalizedValue: "DIESEL", decisionUse: "HARD_FILTER" }));
    expect(output.state.ledger).not.toContainEqual(expect.objectContaining({ concept: "fuelType", normalizedValue: "BEV", status: "ACTIVE" }));
    expect(output.state.ledger).toContainEqual(expect.objectContaining({ concept: "equipmentFeature", normalizedValue: "POWER_SLIDING_SIDE_DOOR", decisionUse: "HARD_FILTER" }));
  });

  it("records heated front seats as a governed equipment requirement", async () => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    const output = await runV3Turn({ conversationId: "heated-front-seats", messageId: "1", message: "Benzinli otomatik bir SUV istiyorum, donanımda ısıtmalı ön koltuklar olmalı.", expectedRevision: 0 });
    expect(output.state.ledger).toContainEqual(expect.objectContaining({ concept: "equipmentFeature", normalizedValue: "HEATED_FRONT_SEATS", decisionUse: "HARD_FILTER" }));
    expect(output.state.lastQuestionKey).not.toMatch(/Equipment$/u);
  });

  it("answers pure automotive information without mutating preferences, then asks one low-pressure sales question", async () => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    const output = await runV3Turn({ conversationId: "v38-info", messageId: "1", message: "Elektrikli araç bataryasının ömrü ne kadar?", expectedRevision: 0 });
    expect(output.state.lastRoute).toBe("AUTOMOTIVE_INFORMATION");
    expect(output.state.ledger).toHaveLength(0);
    expect(output.message).toMatch(/kapasitesini yıllar içinde.*yalnızca bilgi.*kendi kullanımın/iu);
    expect(output.state.lastQuestionKey).toBe("purchaseInterest");
  });

  it("does not mistake large pets or a nature trip for commercial or rough-road use", async () => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    const dog = await runV3Turn({ conversationId: "large-dogs", messageId: "1", message: "İki büyük köpeğimi hafta sonları doğaya götürmek için geniş bagajlı bir araç satın almak istiyorum.", expectedRevision: 0 });
    expect(dog.state.ledger).not.toContainEqual(expect.objectContaining({ concept: "primaryUsage", normalizedValue: "MIXED_ROAD", status: "ACTIVE" }));
    expect(dog.state.ledger).not.toContainEqual(expect.objectContaining({ concept: "primaryUsage", normalizedValue: "COMMERCIAL", status: "ACTIVE" }));
    const firstCar = await runV3Turn({ conversationId: "large-first-car", messageId: "1", message: "Ehliyetimi yeni aldım. Boyutları çok büyük olmayan otomatik ilk aracımı satın almak istiyorum.", expectedRevision: 0 });
    expect(firstCar.state.ledger).not.toContainEqual(expect.objectContaining({ concept: "primaryUsage", normalizedValue: "COMMERCIAL", status: "ACTIVE" }));
  });

  it("keeps alternative target fuels together and ignores the current vehicle fuel", async () => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    const alternatives = await runV3Turn({ conversationId: "fuel-alternatives", messageId: "1", message: "Uzun yolda kullanmak için hibrit ya da elektrikli bir araç satın almak istiyorum.", expectedRevision: 0 });
    expect(alternatives.state.ledger).toContainEqual(expect.objectContaining({ concept: "fuelType", normalizedValue: ["HEV", "BEV"] }));
    const replacement = await runV3Turn({ conversationId: "current-hybrid", messageId: "1", message: "Corolla Hibrit aracımı Toyota'nın tam elektrikli bir modeliyle değiştirmek istiyorum.", expectedRevision: 0 });
    expect(replacement.state.ledger).toContainEqual(expect.objectContaining({ concept: "fuelType", normalizedValue: "BEV" }));
  });

  it("never exposes internal preference identifiers in a no-match explanation", async () => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    let output = await runV3Turn({ conversationId: "human-no-match", messageId: "1", message: "Kolili ürün dağıtımı için dizel ve kompakt hatchback bir araç satın almak istiyorum.", expectedRevision: 0 });
    output = await runV3Turn({ conversationId: "human-no-match", messageId: "2", message: "Tek araç öner", expectedRevision: output.state.revision, state: output.state });
    expect(output.message).not.toMatch(/primaryUsage|bodyStyle|fuelType|aday havuzu|HEV|BEV/u);
    expect(output.state.lastQuestionKey).toMatch(/^constraintRelaxation:/u);
  });

  it("offers a usable relaxation choice and expands a zero-candidate budget selection", async () => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    let output = await runV3Turn({ conversationId: "budget-relaxation", messageId: "1", message: "Bütçemi karar filtresi olarak kullan ve 950.000 TL sınırımı aşma. Şehir içi için otomatik hatchback araç satın almak istiyorum.", expectedRevision: 0 });
    expect(output.state.lastQuestionKey).toMatch(/^constraintRelaxation:.*budgetMax/u);
    output = await runV3Turn({ conversationId: "budget-relaxation", messageId: "2", message: "Bütçeyi karardan çıkar, ihtiyaç odaklı devam", expectedRevision: output.state.revision, state: output.state });
    expect(output.state.budgetMode).toBe("NEEDS_ONLY");
    expect(output.message).not.toMatch(/uygun araç kalmıyor/iu);
  });
});
