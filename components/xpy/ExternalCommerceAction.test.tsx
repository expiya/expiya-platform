import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ExternalCommerceAction } from "./ExternalCommerceAction";

describe("ExternalCommerceAction", () => {
  it("renders the exact target, disclosure, attribution, and sponsored relationship", () => {
    const html = renderToStaticMarkup(<ExternalCommerceAction action={{ schemaVersion: "external-commerce-action/v1", exactProductId: "P1", provider: "AMAZON_CREATORS_API", label: "Amazon’da görüntüle", href: "https://www.amazon.com.tr/dp/B0ABC12345?tag=expiya-21", disclosure: "(ücretli bağlantı) Amazon Satış Ortağı olarak uygun alışverişlerden gelir elde ederiz.", sourceLabel: "Amazon Creators API", retrievedAt: "2026-09-05T10:00:00.000Z", expiresAt: "2026-09-05T11:00:00.000Z", rel: "nofollow sponsored noreferrer" }} />);
    expect(html).toContain("Amazon’da görüntüle");
    expect(html).toContain("https://www.amazon.com.tr/dp/B0ABC12345?tag=expiya-21");
    expect(html).toContain("nofollow sponsored noreferrer");
    expect(html).toContain("ücretli bağlantı");
  });
});
