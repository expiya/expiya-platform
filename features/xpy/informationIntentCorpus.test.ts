import { describe, expect, it } from "vitest";
import { detectXpyAdvisoryIntent } from "./advisory";

const domains = ["araba", "çamaşır makinesi", "kurutma makinesi", "buzdolabı", "bulaşık makinesi", "süpürge", "robot süpürge"] as const;
const informationalTemplates = [
  (domain: string) => `${domain} alırken en çok neye dikat etmek gerekir?`,
  (domain: string) => `${domain} seçerken nelere bakılmalı?`,
  (domain: string) => `${domain} nasıl seçilir?`,
  (domain: string) => `${domain} için önemli kriterlr neler?`,
  (domain: string) => `${domain} seçenekleri arasındaki farklri anlatır mısın?`,
  (domain: string) => `${domain} özelliklerinde artı ve eksiler nelerdir?`,
  (domain: string) => `${domain} teknolojisi faydalı mı, gerekli mi?`,
  (domain: string) => `${domain} hakkında alıcı rehberi ve genel bilgi verir misin?`,
] as const;

describe("XPY domain-neutral product education corpus", () => {
  it.each(domains)("classifies 8/8 general-information families without purchase intent for %s", domain => {
    const classified = informationalTemplates.map(template => detectXpyAdvisoryIntent(template(domain)));
    expect(classified).toHaveLength(8);
    expect(classified.every(result => result && !result.activeBuying && result.kind !== "NOVICE_GUIDANCE")).toBe(true);
  });

  it.each(domains)("keeps the same education family mixed when concrete purchase intent is added for %s", domain => {
    expect(detectXpyAdvisoryIntent(`${domain} alırken nelere dikkat edilir ve satın almak istiyorum`)?.activeBuying).toBe(true);
  });

  it.each(domains)("does not manufacture education intent from a plain product preference for %s", domain => {
    expect(detectXpyAdvisoryIntent(`${domain} istiyorum`)).toBeUndefined();
  });
});
