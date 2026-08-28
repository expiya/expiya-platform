import { afterEach, describe, expect, it } from "vitest";
import { activeDecisionPreferences } from "./ledger";
import { createV3ConversationState, runV3Turn } from "./engine.server";
import { routeConversationMessage } from "./router";

const priorDisabled = process.env.CARS_V31_PROVIDER_DISABLED;
afterEach(() => { if (priorDisabled === undefined) delete process.env.CARS_V31_PROVIDER_DISABLED; else process.env.CARS_V31_PROVIDER_DISABLED = priorDisabled; });

describe("V3.6 direct question behavior", () => {
  it("prioritizes an automotive question over an open material question", () => {
    const route = routeConversationMessage("Elektrikli araçlar normal araçlara göre daha pahalı sanırım?", { hasPurchaseIntent: true, hasOpenQuestion: true });
    expect(route).toMatchObject({ version: "3.8", route: "AUTOMOTIVE_INFORMATION", directAnswerRequired: true, decisionMutationAllowed: false, catalogEvaluationRequired: false });
  });

  it("answers diesel pollution comparisons concretely in bounded fallback", async () => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    const output = await runV3Turn({ conversationId: "diesel-emissions", messageId: "1", message: "Dizel araçlar doğayı diğer tür yakıtlara göre daha fazla mı kirletiyor?", expectedRevision: 0 });
    expect(output.message).toMatch(/karbondioksit/iu);
    expect(output.message).toMatch(/azot oksit.*ince partikül/iu);
    expect(output.message).toMatch(/elektrikli araçlarda egzoz emisyonu yoktur/iu);
    expect(output.message).not.toMatch(/açıklayabilirim/iu);
    expect(output.state.purchaseIntent).toBe("NOT_EXPRESSED");
    expect(output.state.ledger).toHaveLength(0);
  });

  it("normalizes hibrid spelling and answers fuel-saving comparisons concretely", async () => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    const message = "Hibrid araçların yakıt tasarrufu sağladığı doğru mu?";
    expect(routeConversationMessage(message, { hasPurchaseIntent: false, hasOpenQuestion: false }).route).toBe("AUTOMOTIVE_INFORMATION");
    const output = await runV3Turn({ conversationId: "hybrid-saving", messageId: "1", message, expectedRevision: 0 });
    expect(output.message).toMatch(/özellikle şehir içindeki dur-kalk kullanımında.*yakıt tasarrufu/iu);
    expect(output.message).toMatch(/sabit hızlı otoyol kullanımında.*avantaj.*küçülür/iu);
    expect(output.message).not.toMatch(/açıklayabilirim/iu);
    expect(output.state.ledger).toHaveLength(0);
  });

  it("answers the reported question first, then resumes discovery with one question", async () => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    let output = await runV3Turn({ conversationId: "reported-chat", messageId: "1", message: "Merhaba.", expectedRevision: 0, state: createV3ConversationState("reported-chat") });
    for (const [id, message] of [["2", "İyi. Araç bakıyorum."], ["3", "Günlük işe gidiş geliş yeterli benim için."], ["4", "Elektrikli araçlar popüler hale geldi. Ama normal araçlara göre daha pahalı sanırım?"]] as const) output = await runV3Turn({ conversationId: "reported-chat", messageId: id, message, expectedRevision: output.state.revision, state: output.state });
    expect(output.message).toMatch(/satın alma fiyatı.*daha yüksek/iu);
    expect(output.message).toMatch(/toplam avantaj.*yıllık yoluna.*şarj imkânına/iu);
    expect((output.message.match(/\?/gu) ?? [])).toHaveLength(1);
    expect(activeDecisionPreferences(output.state.ledger).some((item) => item.concept === "fuelType")).toBe(false);
  });

  it("treats commuting to work as urban daily use, not commercial use", async () => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    let output = await runV3Turn({ conversationId: "commute", messageId: "1", message: "Araç bakıyorum", expectedRevision: 0 });
    output = await runV3Turn({ conversationId: "commute", messageId: "2", message: "Günlük işe gidiş geliş için", expectedRevision: output.state.revision, state: output.state });
    expect(activeDecisionPreferences(output.state.ledger).find((item) => item.concept === "primaryUsage")?.normalizedValue).toBe("URBAN_DAILY");
    expect(output.state.lastQuestionKey).toBe("bodyStyle");
  });

  it("understands a whole urban-parking story and answers delegated fuel guidance without repeating the question", async () => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    const id = "urban-parking-whole-message";
    let output = await runV3Turn({ conversationId: id, messageId: "1", message: "İş yerim şehir merkezinde. Dar sokaklarda dolaşıyor ve çok paralel park yapıyorum. Manevrası kolay, direksiyonu hafif ve otomatik bir otomobil satın almak istiyorum.", expectedRevision: 0 });
    expect(activeDecisionPreferences(output.state.ledger).find((item) => item.concept === "primaryUsage")?.normalizedValue).toBe("URBAN_DAILY");
    expect(output.state.lastQuestionKey).toBe("confirm:urbanManeuverability");
    output = await runV3Turn({ conversationId: id, messageId: "2", message: "Evet, kompakt olsun.", expectedRevision: output.state.revision, state: output.state });
    expect(output.state.lastQuestionKey).toBe("fuelType");
    output = await runV3Turn({ conversationId: id, messageId: "3", message: "Bilmiyorum, bana öneri sun. Yakıt türlerinin farkları nedir?", expectedRevision: output.state.revision, state: output.state });
    expect(output.message).toMatch(/benzinli.*dizel.*hibrit.*elektrikli/iu);
    expect(output.message).toMatch(/şehir içi.*hibrit/iu);
    expect(output.message).not.toMatch(/yeterince güvenilir|Yakıt türünde net bir tercihin/iu);
    expect(output.state.lastQuestionKey).toMatch(/^verifiedEquipment:/u);
    expect(output.message).toMatch(/geri görüş kamerası|park sensörleri|çevre görüş/iu);
  });

  it("explains that leaving fuel open is not an immediate fuel recommendation", async () => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    const id = "delegated-fuel-copy";
    let output = await runV3Turn({ conversationId: id, messageId: "1", message: "Uzun yolda güvenli, aynı zamanda şehir içinde pratik bir sıfır araç arıyorum", expectedRevision: 0 });
    while (output.state.lastQuestionKey !== "fuelType") {
      const answer = output.state.lastQuestionKey?.startsWith("confirm:") ? "Evet, bunu öncelik yapalım" : "Bu seçeneklerden hiçbiri şart değil";
      output = await runV3Turn({ conversationId: id, messageId: `step-${output.state.revision}`, message: answer, expectedRevision: output.state.revision, state: output.state });
    }
    const before = output.variantCounts?.remaining;
    output = await runV3Turn({ conversationId: id, messageId: "fuel-open", message: "Yakıt türünü şimdilik açık bırakalım", expectedRevision: output.state.revision, state: output.state });
    expect(output.message).toMatch(/araçları elemek için kullanmayacağım/iu);
    expect(output.message).toMatch(/artı ve eksileriyle karşılaştıracağım/iu);
    expect(output.state.lastQuestionKey).not.toBe("fuelType");
    expect(activeDecisionPreferences(output.state.ledger).some((item) => item.concept === "fuelType")).toBe(false);
    expect(output.variantCounts?.remaining).toBe(before);
  });

  it("does not turn an exact 12-way score tie into an ID-based single recommendation", async () => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    const id = "long-road-safety-tie";
    let output = await runV3Turn({ conversationId: id, messageId: "1", message: "Uzun yolda güvenli, aynı zamanda şehir içinde pratik bir araç arıyorum", expectedRevision: 0 });
    output = await runV3Turn({ conversationId: id, messageId: "2", message: "Evet, bunu öncelik yapalım", expectedRevision: output.state.revision, state: output.state });
    output = await runV3Turn({ conversationId: id, messageId: "3", message: "Yakıt türünü şimdilik açık bırakalım", expectedRevision: output.state.revision, state: output.state });
    output = await runV3Turn({ conversationId: id, messageId: "4", message: "Her ikisi de olabilir", expectedRevision: output.state.revision, state: output.state });
    expect(output.state.lastQuestionKey).toMatch(/^verifiedEquipment:/u);
    output = await runV3Turn({ conversationId: id, messageId: "5", message: "Adaptif hız sabitleyici ve kör nokta izleme benim için vazgeçilmez", expectedRevision: output.state.revision, state: output.state });
    expect(output.offerAwaitingConsent).not.toBe(true);
    expect(output.recommendations).toBeUndefined();
    expect(output.state.lastQuestionKey).toBe("brandModel");
    expect(output.message).toMatch(/aynı puanda/iu);
  });

  it("varies conversational acknowledgement copy across consecutive turns", async () => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    let output = await runV3Turn({ conversationId: "ack", messageId: "1", message: "Araç bakıyorum", expectedRevision: 0 });
    output = await runV3Turn({ conversationId: "ack", messageId: "2", message: "Şehir içinde kullanacağım", expectedRevision: output.state.revision, state: output.state }); const first = output.message.split(" ").slice(0, 5).join(" ");
    output = await runV3Turn({ conversationId: "ack", messageId: "3", message: "Özel donanım şart değil", expectedRevision: output.state.revision, state: output.state }); const second = output.message.split(" ").slice(0, 5).join(" ");
    expect(first).not.toBe(second);
    expect(`${first} ${second}`).not.toMatch(/Anladım\./u);
  });
});
