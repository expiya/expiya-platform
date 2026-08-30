import { describe, expect, it } from "vitest";
import { assistantMessageParts, typewriterChunkSize, V3_TECHNICAL_QUICK_CHOICE_LABELS } from "./CarsConversationV3";

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
