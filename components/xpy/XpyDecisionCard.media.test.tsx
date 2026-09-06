import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { XpyDecisionCard } from "./XpyDecisionCard";
import type { XpyStageOneDecisionPresentation } from "@/features/xpy/stageOnePresentation";

function card(media: XpyStageOneDecisionPresentation["media"]): XpyStageOneDecisionPresentation {
  return { schemaVersion: "xpy-stage1-presentation/v1", exactIdentity: { id: "p1", brand: "Marka", model: "Model", configuration: "TR" }, media, badge: "Karar", reasons: ["Uygun"], matchedNeeds: ["İhtiyaç"], supportingContext: [], technicalFacts: [], capabilities: [], limitations: [], offers: [], commerceNotice: "Teklif yok", sources: [], audit: {} };
}

describe("XpyDecisionCard governed media on desktop and mobile", () => {
  it("shows the owned representative with responsive sizing and an explicit non-exact label", () => {
    const html = renderToStaticMarkup(<XpyDecisionCard card={card({ status: "REPRESENTATIVE", src: "/appliances/representative/owned-category-catalog.svg", alt: "Temsilî ürün illüstrasyonu", authorityLabel: "Temsilî görsel; ürünün birebir fotoğrafı değildir", disclosure: "Temsilî illüstrasyon; ürünün birebir fotoğrafı değildir.", cacheMode: "PERSISTENT" })}/>);
    expect(html).toContain("aspect-[16/9]");
    expect(html).toContain("sm:p-6");
    expect(html).toContain("Temsilî görsel; ürünün birebir fotoğrafı değildir");
    expect(html).toContain("Temsilî ürün illüstrasyonu");
  });

  it("makes every transient affiliate image a sponsored direct product link with disclosure", () => {
    const html = renderToStaticMarkup(<XpyDecisionCard card={card({ status: "EXACT", src: "https://images.example/asin.jpg", alt: "Exact ürün", linkTarget: "https://www.amazon.com.tr/dp/B0ABC12345?tag=expiya-21", disclosure: "(ücretli bağlantı) Amazon Satış Ortağı olarak uygun alışverişlerden gelir elde ederiz.", cacheMode: "TRANSIENT_URL_ONLY" })}/>);
    expect(html).toContain('href="https://www.amazon.com.tr/dp/B0ABC12345?tag=expiya-21"');
    expect(html).toMatch(/rel="[^"]*nofollow[^"]*sponsored[^"]*noreferrer/u);
    expect(html).toContain("Amazon Satış Ortağı");
  });

  it("exposes the whole authorized card as an Aşama 2 activation surface", () => {
    const html = renderToStaticMarkup(<XpyDecisionCard card={card({ status: "UNAVAILABLE", alt: "Görsel yok", cacheMode: "PERSISTENT" })} onActivate={() => undefined} activationLabel="Model için Aşama 2'yi aç"/>);
    expect(html).toContain('data-clickable="true"');
    expect(html).toContain('tabindex="0"');
    expect(html).toContain("Model için Aşama 2&#x27;yi aç");
  });
});
