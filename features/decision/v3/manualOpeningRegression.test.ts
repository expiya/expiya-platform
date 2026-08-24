import { afterEach, describe, expect, it } from "vitest";
import { runV3Turn } from "./engine.server";
import { routeConversationMessage } from "./router";

const priorDisabled = process.env.CARS_V31_PROVIDER_DISABLED;
afterEach(() => { if (priorDisabled === undefined) delete process.env.CARS_V31_PROVIDER_DISABLED; else process.env.CARS_V31_PROVIDER_DISABLED = priorDisabled; });

describe("V3.7 manual one-turn opening regressions", () => {
  it.each([
    "Az yakan şehir içi hatchback önerir misin?",
    "Satış ekibim için ekonomik ticari araç seçenekleriniz neler?",
    "Elektrikli araçlar gerçekten daha mı çok yanıyor? 2 milyon bütçeyle hangisini almalıyım?",
    "Selamlar, elektrikli araçların şarjını merak etmiştim ama uygun bir şey varsa yarın gelip alabilirim; ne var elinizde?",
    "Şehir içi az yaksın, hafta sonu kampa gitsin, 1.4 milyon bütçemi aşmasın. Varsa hemen alıyorum.",
  ])("treats a vehicle recommendation request as purchase intent: %s", (message) => {
    expect(["PURCHASE_INTENT_DISCOVERY", "RECOMMENDATION_OR_OFFER"]).toContain(routeConversationMessage(message, { hasPurchaseIntent: false, hasOpenQuestion: false }).route);
  });

  it("recognizes used-car inspection as automotive information even when the model is unavailable", async () => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    const output = await runV3Turn({ conversationId: "used-info", messageId: "1", message: "İkinci el alırken ekspertizde nelere dikkat etmeliyim?", expectedRevision: 0 });
    expect(output.state.lastRoute).toBe("AUTOMOTIVE_INFORMATION");
    expect(output.message).toMatch(/şasi.*airbag.*bağımsız/iu);
    expect(output.message).not.toMatch(/^Merhaba/iu);
  });

  it("keeps urgency as context instead of falsely claiming a live-stock request", async () => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    const output = await runV3Turn({ conversationId: "urgent-ev", messageId: "1", message: "Elektrikli araçların şarjı beni düşündürüyor ama yarın araç almak istiyorum.", expectedRevision: 0 });
    expect(output.message).not.toMatch(/canlı bayi stoğu/iu);
    expect(output.message).toMatch(/şarj rahatlığı/iu);
    expect(output.message).toMatch(/nerede ve ne için/iu);
    expect(output.state.purchaseIntent).toBe("EXPLICIT");
  });

  it("states the commercial-offer boundary without losing the advisory capability", async () => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    const output = await runV3Turn({ conversationId: "fleet-offer", messageId: "1", message: "Şirket için acil filo aracı almamız gerekiyor, teklif bekliyorum.", expectedRevision: 0 });
    expect(output.state.purchaseIntent).toBe("EXPLICIT");
    expect(output.message).toMatch(/resmî fiyat teklifi hazırlayamıyorum.*tarafsız bir kısa liste/iu);
  });
});
