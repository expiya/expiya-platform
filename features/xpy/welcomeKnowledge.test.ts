import { describe, expect, it } from "vitest";
import { XPY_DOMAIN_PACKS } from "./domainPacks";
import { carsWelcomeText, honestXpyWelcomeFallback, renderXpyWelcome } from "./welcomeKnowledge";
import type { XpyDomainPackRegistration } from "./contracts";

describe("shared X category-knowledge welcome", () => {
  it("gives Cars a Domain Pack orientation followed by exactly one simple question", () => {
    const text = carsWelcomeText();
    expect(text).toContain("Otomobil seçimi");
    expect(text.match(/\?/gu)).toHaveLength(1);
    expect(text).not.toMatch(/(?:[a-zçğıöşü]+_[a-z0-9_]+|\b(?:enum|runtime|concept|field|policy|exact)\b)/iu);
  });
  it("covers every active pack category with a safe honest fallback contract", () => {
    for (const pack of Object.values(XPY_DOMAIN_PACKS) as XpyDomainPackRegistration[]) for (const category of pack.categories) {
      const config = pack.xReentry[category];
      expect(config).toBeDefined();
      const text = renderXpyWelcome(honestXpyWelcomeFallback(config!, "Bu ürünü en çok nerede kullanmayı düşünüyorsun?"));
      expect(text.match(/\?/gu)).toHaveLength(1);
      expect(text).not.toMatch(/(?:[a-zçğıöşü]+_[a-z0-9_]+|\b(?:enum|runtime|concept|field|policy|exact)\b)/iu);
    }
  });
});
