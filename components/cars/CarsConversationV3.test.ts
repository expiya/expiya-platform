import { describe, expect, it } from "vitest";
import { assistantMessageParts, buttonPrompt, quickChoices, typewriterChunkSize, V3_TECHNICAL_QUICK_CHOICE_LABELS } from "./CarsConversationV3";

describe("V3 technical quick choices", () => {
  it("has a visible button definition for every technical discriminator", () => {
    expect(Object.keys(V3_TECHNICAL_QUICK_CHOICE_LABELS).sort()).toEqual([
      "BATTERY", "CHARGING", "COMPACT", "CONSUMPTION", "HEIGHT", "LUGGAGE", "PAYLOAD", "POWER", "PRICE", "RANGE", "TORQUE", "TOWING", "WHEELBASE", "WIDTH",
    ]);
    for (const [label, description] of Object.values(V3_TECHNICAL_QUICK_CHOICE_LABELS)) {
      expect(label.length).toBeGreaterThan(3);
      expect(description.length).toBeGreaterThan(12);
    }
  });
});

describe("V3 sequential assistant reveal", () => {
  it("never offers an exact vehicle after the reference is known to be unavailable", () => {
    const choices = quickChoices({
      id: "reference-unavailable",
      role: "assistant",
      content: "Birebir araç aktif katalogda bulunmuyor.",
      trace: { revision: 1, purchaseIntent: "EXPLICIT", lastQuestionKey: "unavailableReferenceChoice", ledger: [], offerAwaitingConsent: false },
    });
    expect(choices?.choices.map((choice) => choice.label)).toEqual([
      "Araç hakkında bilgi",
      "Güncel benzerini bul",
    ]);
    expect(choices?.choices.some((choice) => /birebir/iu.test(choice.label))).toBe(false);
  });
  it("keeps the human purchase-interest response above its choices", () => {
    const content = "Bu eğlenceli bir başlangıç! Hayalindeki aracı birlikte keşfedebiliriz. Bunu yalnızca merak için mi soruyorsun, yoksa kendin için bir araç seçmeyi düşünüyor musun?";
    expect(buttonPrompt({ id: "1", role: "assistant", content, trace: { revision: 1, purchaseIntent: "NOT_EXPRESSED", lastQuestionKey: "purchaseInterest", ledger: [], offerAwaitingConsent: false } }, true)).toBe(content);
  });
  it("keeps contextual guidance above structural quick choices", () => {
    const content = "Haklısın; yük taşımayı sen söylemedin. Aile kullanımını esas alıyorum. Park kolaylığı mı, daha ferah ve yüksek bir yapı mı senin için daha önemli?";
    expect(buttonPrompt({ id: "2", role: "assistant", content, trace: { revision: 2, purchaseIntent: "EXPLICIT", lastQuestionKey: "bodyStyle", ledger: [], offerAwaitingConsent: false } }, true)).toBe(content);
  });
  it("keeps short answers in one bubble and splits long answers into readable bubbles", () => {
    expect(assistantMessageParts("Kısa ve net bir yanıt.")).toEqual(["Kısa ve net bir yanıt."]);
    const long = "İlk açıklama kullanıcının ihtiyacını anlaşılır biçimde özetler ve önemli bağlamı açıklar. İkinci açıklama seçenekler arasındaki farkı daha ayrıntılı biçimde anlatır ve kararın nasıl ilerleyeceğini gösterir. Üçüncü açıklama kullanıcıdan yalnız bir sonraki anlamlı seçimi ister.";
    const parts = assistantMessageParts(long);
    expect(parts.length).toBeGreaterThan(1);
    expect(parts.join(" ")).toBe(long);
  });

  it("uses adaptive chunks so long text flows without an excessive wait", () => {
    expect(typewriterChunkSize(40)).toBe(1);
    expect(typewriterChunkSize(440)).toBe(4);
  });
});
