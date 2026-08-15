import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { RecommendedCar } from "@/types/recommendation";
import type { CarsPriceValidityStatus } from "@/types/carsConversation";

vi.mock("next/image", () => ({ default: ({ alt }: { alt: string }) => (
  <span data-image-alt={alt} />
) }));
vi.mock("next/link", () => ({ default: ({ children, ...properties }: React.PropsWithChildren<{ href: string }>) => (
  <a {...properties}>{children}</a>
) }));

import { CarCard } from "./CarCard";

function recommendation(validityStatus: CarsPriceValidityStatus, validUntil?: string): RecommendedCar {
  return {
    car: {
      id: "clio", brand: "Renault", model: "Clio", year: 2026, price: 1_830_000, km: 0,
      fuel: "Gasoline", transmission: "Automatic", bodyType: "Hatchback", image: "/cars/renault-clio.jpg",
      createdAt: "2026-08-01T00:00:00.000Z", updatedAt: "2026-08-01T00:00:00.000Z",
    },
    decision: {
      decisionId: "dec_clio", score: 90, recommendation: "Renault Clio", reasons: ["Şehir içi kullanım"],
      confidence: { value: 92, level: "high", explanation: "Doğrulanmış veri" },
    },
    isTopPick: true,
    pricePresentation: { amountTry: 1_830_000, priceType: "LIST", validityStatus, validUntil },
  };
}

describe("CarCard price freshness", () => {
  it("keeps the expired price and vehicle visible while showing the warning", () => {
    const html = renderToStaticMarkup(<CarCard recommendedCar={recommendation("EXPIRED", "2026-08-31T20:59:59.999Z")} />);
    expect(html).toContain("Renault Clio");
    expect(html).toContain("1.830.000 TL");
    expect(html).toContain("Güncel olmayabilir");
    expect(html).toContain("31 Ağustos 2026");
    expect(html).toContain("break-words");
  });

  it("does not show the warning for a current price", () => {
    const html = renderToStaticMarkup(<CarCard recommendedCar={recommendation("CURRENT", "2026-08-31T20:59:59.999Z")} />);
    expect(html).toContain("1.830.000 TL");
    expect(html).not.toContain("Güncel olmayabilir");
  });

  it("never renders an internal-only estimate", () => {
    const estimated = recommendation("CURRENT");
    estimated.car.price = 9_999_999;
    estimated.car.priceDisplayAllowed = false;
    estimated.pricePresentation = undefined;
    const html = renderToStaticMarkup(<CarCard recommendedCar={estimated} />);
    expect(html).toContain("Renault Clio");
    expect(html).not.toContain("9.999.999");
    expect(html).not.toContain("Liste");
    expect(html).toContain("Güncel fiyat doğrulanıyor");
  });

  it("renders a public list presentation even if the fallback car price is internal", () => {
    const mixed = recommendation("CURRENT");
    mixed.car.price = 9_999_999;
    mixed.car.priceDisplayAllowed = false;
    mixed.pricePresentation = { amountTry: 1_830_000, priceType: "LIST", validityStatus: "CURRENT" };
    const html = renderToStaticMarkup(<CarCard recommendedCar={mixed} />);
    expect(html).toContain("1.830.000 TL");
    expect(html).not.toContain("9.999.999");
  });
});
