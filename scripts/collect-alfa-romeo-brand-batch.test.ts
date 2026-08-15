import { describe, expect, it } from "vitest";

import { extractEffectiveDate, extractOfficialPriceRows } from "./collect-alfa-romeo-brand-batch";

const SAMPLE = `
  <p>03.08.2026 tarihinden itibaren geçerlidir.</p>
  <p class="year">2026</p>
  <tr align="center" class="mobile-disable">
    <td>JUNIOR ELETTRICA</td><td>4x2</td><td>Speciale+</td>
    <td>&#199;ift Kavramal&#305; Otomatik</td><td>Elektrik</td><td>2.474.300 TL</td>
  </tr>`;

describe("Alfa Romeo official price collector", () => {
  it("extracts the circular effective date", () => {
    expect(extractEffectiveDate(SAMPLE)).toBe("2026-08-03");
  });

  it("normalizes an exact official configuration and Turkish HTML entities", () => {
    expect(extractOfficialPriceRows(SAMPLE, "2026-08-16T09:00:00.000Z")).toEqual([expect.objectContaining({
      brand: "Alfa Romeo", model: "JUNIOR ELETTRICA", product_year: 2026, drivetrain: "4x2",
      trim: "Speciale+", transmission: "Çift Kavramalı Otomatik", fuel: "Elektrik",
      list_price_try: 2474300, price_effective_from: "2026-08-03",
    })]);
  });

  it("does not treat mobile duplicate rows as distinct configurations", () => {
    expect(extractOfficialPriceRows(SAMPLE.replace("mobile-disable", "mobile-enable"), "2026-08-16T09:00:00.000Z")).toEqual([]);
  });
});
