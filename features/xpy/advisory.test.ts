import { describe, expect, it } from "vitest";
import { detectXpyAdvisoryIntent, domainAdvisory } from "./advisory";

describe("XPY X advisory intent", () => {
  it.each([
    "kurutma makinleri hakkında hiç bilgim yok. yardımcı ol",
    "nerden baslamaliyim?",
    "Bu kategoriye yabancıyım, yardm edermisin",
  ])("recognizes novice guidance despite ordinary Turkish variation: %s", message => {
    expect(detectXpyAdvisoryIntent(message)?.kind).toBe("NOVICE_GUIDANCE");
  });

  it("separates broad education from mixed buying intent", () => {
    expect(detectXpyAdvisoryIntent("Robot süpürgeler hakkında genel bilgi verir misin?")).toEqual({ kind: "GENERAL_EDUCATION", activeBuying: false });
    expect(detectXpyAdvisoryIntent("Genel bilgi istiyorum ve bir robot süpürge satın almak istiyorum")).toEqual({ kind: "GENERAL_EDUCATION", activeBuying: true });
  });

  it.each([
    ["Çamaşır makinesi alırken en çok neye dikat etmek gerekir?", "CATEGORY_GUIDANCE"],
    ["Bir ürünü nasıl seçerim, önemli kriterler neler?", "CATEGORY_GUIDANCE"],
    ["Isı pompası faydalı mı, gerekli mi?", "FEATURE_EDUCATION"],
    ["A ile B arasındaki farklar ve artı eksiler neler?", "COMPARISON_INFORMATION"],
    ["Bu teknolojinin ne işe yaradığını anlatır mısın?", "FEATURE_EDUCATION"],
  ] as const)("classifies semantic education family without purchase mutation: %s", (message, kind) => {
    expect(detectXpyAdvisoryIntent(message)).toEqual({ kind, activeBuying: false });
  });

  it("distinguishes generic buyer guidance from concrete first-person intent", () => {
    expect(detectXpyAdvisoryIntent("Buzdolabı alırken nelere dikkat etmek gerekir?")?.activeBuying).toBe(false);
    expect(detectXpyAdvisoryIntent("Buzdolabı alırken nelere dikkat etmeliyim; benim için düşük ses şart")?.activeBuying).toBe(true);
  });

  it("does not steal a pending-question uncertainty answer", () => {
    expect(detectXpyAdvisoryIntent("bilmiyorum")).toBeUndefined();
  });

  it.each([
    "Parkı kolay hatchback olsun",
    "Dar sokaklarda çok paralel park yapıyorum",
    "Dikkat çekici, farklı tasarımlı bir araba istiyorum",
    "Panelvan istiyorum; arka park sensörü olsun",
  ])("does not confuse ordinary decision language with general information: %s", message => {
    expect(detectXpyAdvisoryIntent(message)).toBeUndefined();
  });

  it("fail-closes advisory copy containing internal vocabulary", () => {
    expect(() => domainAdvisory("Candidate registry alanını açıklayayım.")).toThrow("XPY_ADVISORY_COPY_NOT_CONSUMER_SAFE");
  });
});
