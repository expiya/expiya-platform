import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { V2AuthorizedCarCard } from "./V2AuthorizedCarCard";

describe("V2AuthorizedCarCard", () => {
  it("links an authorized card to its conversation-backed detail page", () => {
    const markup = renderToStaticMarkup(<V2AuthorizedCarCard card={{ exactVariantId: "variant-1", title: "Örnek Araç", brand: "Örnek", model: "Araç", trim: "Plus", fuelLabel: "Elektrik", image: "/cars/placeholder.svg", imageStatus: "PLACEHOLDER", decisionSummary: { recommendation: "İhtiyaçlarla uyumlu.", reasons: ["Günlük kullanıma uygun"], confidenceLabel: "YUKSEK" }, caveats: [] }} />);
    expect(markup).toContain('href="/decision/v2-variant-1"');
    expect(markup).toContain("Ayrıntılı analizi aç");
  });
});
