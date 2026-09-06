import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { XpyDecisionCard } from "./XpyDecisionCard";
import type { XpyStageOneDecisionPresentation } from "@/features/xpy/stageOnePresentation";

function card(media: XpyStageOneDecisionPresentation["media"]): XpyStageOneDecisionPresentation {
  return { schemaVersion: "xpy-stage1-presentation/v1", exactIdentity: { id: "p1", brand: "Marka", model: "Model", configuration: "8 GB / 256 GB" }, media, badge: "Karar", reasons: ["Uygun. İkinci cümle gösterilmez."], matchedNeeds: ["İhtiyaç"], supportingContext: [], technicalFacts: [{ label: "İç kayıt", value: "korunur" }], capabilities: [({ label: "Özellik" })], limitations: ["Sınır"], offers: [], commerceNotice: "Teklif yok", sources: [{ label: "İç kaynak", href: "https://example.com/source" }], audit: { fingerprint: "internal" } };
}

describe("XpyDecisionCard governed media on desktop and mobile", () => {
  it("shows the owned representative with responsive sizing and an explicit non-exact label", () => {
    const html = renderToStaticMarkup(<XpyDecisionCard card={card({ status: "REPRESENTATIVE", src: "/appliances/representative/owned-category-catalog.svg", alt: "Temsilî ürün illüstrasyonu", authorityLabel: "Temsilî görsel; ürünün birebir fotoğrafı değildir", disclosure: "Temsilî illüstrasyon; ürünün birebir fotoğrafı değildir.", cacheMode: "PERSISTENT" })}/>);
    expect(html).toContain("aspect-[16/9]");
    expect(html).toContain("sm:p-6");
    expect(html).toContain("Temsilî ürün illüstrasyonu");
    expect(html).toContain("object-contain");
    expect(html).not.toContain("İç kaynak");
    expect(html).not.toContain("Teknik gerçekler");
  });

  it("keeps transient media governed without turning its affiliate target into Stage 2", () => {
    const html = renderToStaticMarkup(<XpyDecisionCard card={card({ status: "EXACT", src: "https://images.example/asin.jpg", alt: "Exact ürün", linkTarget: "https://www.amazon.com.tr/dp/B0ABC12345?tag=expiya-21", disclosure: "(ücretli bağlantı) Amazon Satış Ortağı olarak uygun alışverişlerden gelir elde ederiz.", cacheMode: "TRANSIENT_URL_ONLY" })}/>);
    expect(html).not.toContain('href="https://www.amazon.com.tr/dp/B0ABC12345?tag=expiya-21"');
    expect(html).not.toContain("Amazon Satış Ortağı");
    expect(html).toContain("object-contain");
  });

  it("exposes only image and name as accessible Aşama 2 activation surfaces", () => {
    const html = renderToStaticMarkup(<XpyDecisionCard card={card({ status: "UNAVAILABLE", alt: "Görsel yok", cacheMode: "PERSISTENT" })} onActivate={() => undefined} activationLabel="Model için Aşama 2'yi aç"/>);
    expect(html).not.toContain('data-clickable="true"');
    expect(html.match(/aria-label="Model için Aşama 2&#x27;yi aç"/gu)).toHaveLength(2);
    expect(html.match(/<button/gu)?.length).toBeGreaterThanOrEqual(3);
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain("Ayrıntıyı göster");
  });

  it("leaves image and name non-interactive when Stage 2 is unavailable", () => {
    const html = renderToStaticMarkup(<XpyDecisionCard card={card({ status: "UNAVAILABLE", alt: "Görsel yok" })}/>);
    expect(html).not.toContain("Aşama 2&#x27;yi aç");
    expect(html.match(/<button/gu)).toHaveLength(1);
    expect(html).toContain("Uygun.");
    expect(html).not.toContain("İkinci cümle");
    expect(html).not.toContain("İhtiyaç");
  });
});
