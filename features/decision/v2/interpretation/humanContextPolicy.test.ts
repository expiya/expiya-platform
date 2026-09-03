import { describe, expect, it } from "vitest";
import { detectHumanContext } from "./humanContextPolicy";

describe("human context and conversational etiquette policy", () => {
  it.each([
    ["İlk arabam olacak, çok heyecanlıyım.", "FIRST_CAR"],
    ["Ehliyetimi yeni aldım, araç kullanırken kendime güvenmiyorum.", "FIRST_CAR"],
    ["Arabayı kızım için alıyorum.", "BUYING_FOR_OTHER"],
    ["Acil araba almam gerekiyor.", "URGENCY"],
    ["Hiç anlamıyorum, nereden başlayacağımı bilmiyorum.", "UNCERTAINTY"],
    ["Bu kadar seçenek yüzünden endişeliyim.", "ANXIETY"],
    ["Önerini beğenmedim, bu olmadı.", "DISAPPOINTMENT"],
    ["Evlendim, ailemiz büyüyor.", "LIFE_CHANGE"],
    ["İkinci çocuk da yolda, arabasız olmaz.", "LIFE_CHANGE"],
    ["Yeni araba için sabırsızlanıyorum.", "EXCITEMENT"],
    ["Dört tekerli terapi olsun 😂", "HUMOR"],
  ] as const)("recognizes %s as %s", (message, expected) => {
    const match = detectHumanContext(message);
    expect(match?.kind).toBe(expected);
    expect(match?.safeAcknowledgement.trim().length).toBeGreaterThan(10);
  });

  it("does not manufacture emotional context from an ordinary vehicle fact", () => {
    expect(detectHumanContext("Şehir içinde kullanacağım, otomatik olsun.")).toBeNull();
  });

  it("congratulates a growing family in natural Turkish", () => {
    const acknowledgement = detectHumanContext("İkinci çocuk da yolda, arabasız olmaz.")?.safeAcknowledgement ?? "";
    expect(acknowledgement).toMatch(/gözünüz aydın.*ailenizin.*araç/iu);
    expect(acknowledgement).not.toMatch(/dört kişi|işe gidiş/iu);
  });
});
