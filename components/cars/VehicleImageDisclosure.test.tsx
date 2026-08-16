import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { VehicleImageDisclosure } from "./VehicleImageDisclosure";

describe("VehicleImageDisclosure", () => {
  it("names the represented model for an approximate image in Turkish", () => {
    const html = renderToStaticMarkup(<VehicleImageDisclosure
      imageStatus="APPROXIMATE"
      imageRepresentativeOf="Toyota RAV4"
      locale="tr"
    />);
    expect(html).toContain("Temsilî görsel: Bu fotoğraf Toyota RAV4 modeline aittir.");
    expect(html).toContain('role="note"');
  });

  it("uses the Turkish fallback when the represented model is unavailable", () => {
    const html = renderToStaticMarkup(<VehicleImageDisclosure imageStatus="APPROXIMATE" locale="tr" />);
    expect(html).toContain("Bu fotoğraf önerilen aracın birebir görüntüsü olmayabilir.");
  });

  it.each(["EXACT", "REPRESENTATIVE"] as const)("does not show the approximate warning for %s", (imageStatus) => {
    const html = renderToStaticMarkup(<VehicleImageDisclosure imageStatus={imageStatus} />);
    expect(html).not.toContain("Temsilî görsel");
    expect(html).not.toContain('role="note"');
  });

  it("renders the model-specific and fallback English messages", () => {
    const named = renderToStaticMarkup(<VehicleImageDisclosure
      imageStatus="APPROXIMATE"
      imageRepresentativeOf="Toyota RAV4"
      locale="en"
    />);
    const fallback = renderToStaticMarkup(<VehicleImageDisclosure imageStatus="APPROXIMATE" locale="en" />);
    expect(named).toContain("Representative image: This photo shows the Toyota RAV4.");
    expect(fallback).toContain("This may not be an exact image of the recommended vehicle.");
  });

  it("renders attribution separately from the warning", () => {
    const html = renderToStaticMarkup(<VehicleImageDisclosure
      imageStatus="APPROXIMATE"
      imageRepresentativeOf="Toyota RAV4"
      imageAttribution="Toyota Türkiye medya arşivi"
      locale="tr"
    />);
    expect(html).toContain("Temsilî görsel:");
    expect(html).toContain("Görsel kaynağı: Toyota Türkiye medya arşivi");
    expect((html.match(/<p/g) ?? [])).toHaveLength(2);
  });
});
