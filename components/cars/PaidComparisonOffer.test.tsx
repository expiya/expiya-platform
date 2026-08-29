import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

import { PaidComparisonOffer } from "./PaidComparisonOffer";

describe("PaidComparisonOffer", () => {
  it("presents the optional paid report without diminishing the free decision", () => {
    const html = renderToStaticMarkup(<PaidComparisonOffer
      conversationId="conversation-1"
      stateToken="signed-state"
      offerId="offer-1"
      selectedExactVariantId="variant-1"
    />);

    expect(html).toContain("Kişisel Araç Karşılaştırma Raporu");
    expect(html).toContain("İsteğe bağlı · Ücretli");
    expect(html).toContain("349 TL");
    expect(html).toContain("KDV dahil");
    expect(html).toContain("2 araç seç ve karşılaştır");
    expect(html).toContain("Ödeme öncesinde karşılaştırılacak 3 aracı görebilirsin.");
    expect(html).toContain('href="/cars/paid-comparison/sample"');
    expect(html).not.toContain("Aşama 2");
    expect(html).not.toContain("Aşama 3");
  });

  it("accepts the already validated vehicle-detail handoff", () => {
    const html = renderToStaticMarkup(<PaidComparisonOffer
      conversationId="conversation-1"
      phase2Token="signed-phase-2"
      offerId="offer-1"
      selectedExactVariantId="variant-1"
    />);

    expect(html).toContain("2 araç seç ve karşılaştır");
  });
});
