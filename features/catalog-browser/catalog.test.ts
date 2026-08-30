import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { DEFAULT_CATALOG_CLASS, DEFAULT_CATALOG_SORT, getCatalogBrowserPage, parseCatalogBrowserQuery } from "./catalog.server";

describe("catalog browser", () => {
  it("parses bounded public filters", () => {
    expect(parseCatalogBrowserQuery({ brand: "Kia", page: "-2", sort: "PRICE_ASC", maxPrice: "3.000.000 TL" })).toMatchObject({ brand: "Kia", page: 1, sort: "PRICE_ASC", maxPriceTry: 3_000_000 });
  });

  it("opens with focused defaults but preserves an explicit all-class search", () => {
    expect(parseCatalogBrowserQuery({})).toMatchObject({ useClass: DEFAULT_CATALOG_CLASS, sort: DEFAULT_CATALOG_SORT });
    expect(parseCatalogBrowserQuery({ class: "", sort: "BRAND_ASC" })).toMatchObject({ useClass: "", sort: "BRAND_ASC" });
  });

  it("reads the active catalog and filters exact public rows", async () => {
    const result = await getCatalogBrowserPage(parseCatalogBrowserQuery({ brand: "Kia", sort: "BRAND_ASC" }), new Date("2026-08-30T12:00:00.000Z"));
    expect(result.initialCount).toBe(549);
    expect(result.total).toBeGreaterThan(0);
    expect(result.rows.every((row) => row.brand === "Kia")).toBe(true);
  });

  it("never exposes an internal estimate as a monetary display", async () => {
    const result = await getCatalogBrowserPage(parseCatalogBrowserQuery({ sort: "PRICE_DESC" }), new Date("2026-08-30T12:00:00.000Z"));
    for (const row of result.rows.filter((item) => item.priceStatus === "INTERNAL_ONLY")) expect(row.priceDisplay).toBe("Güncel fiyat doğrulanıyor");
  });
});
