import { afterEach, describe, expect, it, vi } from "vitest";
import type { VariantContentArtifact } from "./types";
import { researchSelectedVehicleOfficialSources } from "./officialResearch.server";

const artifact = {
  schemaVersion: "variant-content/v2", artifactVersion: "2", exactVariantId: "v", catalogRelease: "c", catalogFingerprint: "f", title: "Araç Varyant",
  identity: { brand: "A", model: "B", trim: "C", modelYear: 2026 },
  facts: [{ key: "warranty", label: "Garanti", value: "2 yıl", disposition: "VERIFIED", source: { label: "Marka resmî sitesi", url: "https://official.example/vehicle", accessedAt: "2026-08-30" } }],
  equipment: [], colors: [], media: [], price: { status: "UNAVAILABLE", display: "Güncel fiyat doğrulanıyor", note: "-" }, researchStatus: { lastReviewedAt: "2026-08-30", exactFacts: 1, scopedFacts: 0 }, sourceChecksum: "x", checksum: "y",
} satisfies VariantContentArtifact;

describe("selected-vehicle official research", () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

  it("is fail-closed unless explicitly enabled with an allowlisted host", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await expect(researchSelectedVehicleOfficialSources({ question: "Güncel garanti nedir?", artifact })).resolves.toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("uses only a registered allowlisted official source and returns bounded evidence", async () => {
    vi.stubEnv("CARS_PHASE2_OFFICIAL_RESEARCH_ENABLED", "true");
    vi.stubEnv("CARS_PHASE2_OFFICIAL_RESEARCH_HOSTS", "official.example");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("<html><body>Bu araç için güncel garanti koşulları yetkili satıcı sözleşmesinde açıklanır.</body></html>", { headers: { "content-type": "text/html" } }));
    const result = await researchSelectedVehicleOfficialSources({ question: "Güncel garanti koşulları nedir?", artifact });
    expect(result).toHaveLength(1); expect(result[0]?.sourceUrl).toBe("https://official.example/vehicle"); expect(result[0]?.excerpt).toContain("garanti koşulları");
  });

  it("does not fetch user-supplied or non-allowlisted URLs", async () => {
    vi.stubEnv("CARS_PHASE2_OFFICIAL_RESEARCH_ENABLED", "true");
    vi.stubEnv("CARS_PHASE2_OFFICIAL_RESEARCH_HOSTS", "another.example");
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await expect(researchSelectedVehicleOfficialSources({ question: "https://evil.example üzerinden güncel garanti bak", artifact })).resolves.toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
