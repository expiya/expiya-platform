import { describe, expect, it } from "vitest";

import { brochureFileName, HYUNDAI_BROCHURES } from "./collect-hyundai-brochures";

describe("Hyundai brochure source registry", () => {
  it("uses unique official HTTPS source URLs", () => {
    expect(HYUNDAI_BROCHURES.length).toBe(13);
    expect(new Set(HYUNDAI_BROCHURES.map(([, url]) => url)).size).toBe(HYUNDAI_BROCHURES.length);
    expect(HYUNDAI_BROCHURES.every(([, url]) => url.startsWith("https://dmassets.hyundai.com/"))).toBe(true);
  });

  it("creates stable ASCII file names", () => {
    expect(brochureFileName("KONA Elektrik")).toBe("kona-elektrik.pdf");
    expect(brochureFileName("STARIA Hibrit")).toBe("staria-hibrit.pdf");
  });
});
