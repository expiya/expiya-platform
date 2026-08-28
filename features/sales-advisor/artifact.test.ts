import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { CatalogFact, CatalogVariantSnapshot } from "@/features/decision/v2/catalog/types";
import { buildVariantContentArtifact, validateVariantContentArtifact } from "./artifact.server";
import { getReviewedSalesColors, getReviewedSalesMedia } from "./salesKnowledge.server";
import { evaluateV3Catalog } from "@/features/decision/v3/catalogAdapter.server";
import { getEquipmentPublicCopy } from "./equipmentPublicCopy";

const provenance = [{ sourceId: "SRC-1", sourceUrl: "https://example.test/official", accessedAt: "2026-08-20T00:00:00.000Z", extractionMethod: "MANUAL" as const, confidence: "HIGH" as const, limitations: [] }];
const f = <T,>(value: T, confidence: "HIGH" | "MEDIUM" = "HIGH"): CatalogFact<T> => ({ value, confidence, provenance, catalogFingerprint: "sha256:catalog", explanationAccess: "AUTHORITY_REQUIRED" });
const variant: CatalogVariantSnapshot = { id: "exact-1", market: "TR", lifecycleStatus: "ON_SALE", brand: "Örnek", model: "Model", trim: "Plus", identityProvenance: provenance, decisionFacts: { bodyStyle: f("SUV"), modelYear: f(2026), powertrain: { fuelType: f("BEV"), powerKw: f(150), transmission: f("Automatic"), torqueNm: f(300, "MEDIUM") }, dimensions: { seats: f(5), luggageLitres: f(420, "MEDIUM") }, efficiency: { electricRangeKm: f(480), maxDcChargeKw: f(150) }, safetyFeatureCodes: [f("REAR_CAMERA"), f("UNKNOWN_CONFLICT", "MEDIUM")] } };
const price = (priceType: "ESTIMATE" | "LIST", realizationSafe: boolean) => ({ id: `price-${priceType}`, vehicleVariantId: variant.id, market: "TR" as const, condition: "NEW" as const, amountTry: 1_650_000, priceType, consumerVisibility: priceType === "ESTIMATE" ? "INTERNAL_ONLY" as const : "PUBLIC" as const, realizationSafe, ...(priceType === "ESTIMATE" ? { estimationMethod: "versioned-model" } : {}), validFrom: "2026-08-01T00:00:00.000Z", taxTreatment: "INCLUDED" as const, confidence: priceType === "ESTIMATE" ? "LOW" as const : "HIGH" as const, provenance, catalogFingerprint: "sha256:catalog" });

describe("versioned variant content artifact", () => {
  it("never exposes an internal estimated amount in the public artifact", () => {
    const estimated = { ...variant, activeNewPrice: price("ESTIMATE", false) };
    const artifact = buildVariantContentArtifact({ variant: estimated, catalogRelease: "v1", catalogFingerprint: "sha256:catalog" });
    expect(artifact.price).toEqual({
      status: "ESTIMATED",
      display: "Güncel fiyat doğrulanıyor",
      note: "Bu araç değerlendirmeye dahil edildi ancak doğrulanmış güncel satış fiyatı henüz bulunmuyor. Güncel fiyat ve stok durumu için yetkili satıcıdan bilgi alın.",
    });
    expect(JSON.stringify(artifact)).not.toContain("1650000");
    expect(JSON.stringify(artifact)).not.toContain("1.650.000");
  });

  it("continues to expose a verified list price", () => {
    const listed = { ...variant, activeNewPrice: price("LIST", true) };
    const artifact = buildVariantContentArtifact({ variant: listed, catalogRelease: "v1", catalogFingerprint: "sha256:catalog" });
    expect(artifact.price.status).toBe("VERIFIED");
    expect(artifact.price.display).toBe("1.650.000 TL");
  });
  it("publishes market/model-year scoped Jogger colors for every matching variant", () => {
    const colors = getReviewedSalesColors({ brand: "Dacia", model: "Jogger", modelYear: 2026 });
    expect(colors.map((item) => item.value)).toEqual(["Beyaz", "Mineral Gri", "Kum Beji", "Sedir Yeşili", "Terracotta Kahve", "Duman Gri", "Siyah"]);
    expect(colors.every((item) => item.disposition === "FAMILY_LEVEL" && item.source?.url.includes("dacia.com.tr"))).toBe(true);
    expect(colors.every((item) => item.visual?.swatchHex.startsWith("#") && item.visual.approximation)).toBe(true);
    expect(getReviewedSalesColors({ brand: "Dacia", model: "Jogger", modelYear: 2025 })).toEqual([]);
  });
  it("keeps every reviewed local Jogger gallery asset publishable", () => {
    const media = getReviewedSalesMedia("08030664-0509-51a0-ac5e-283bde7843f3");
    expect(media).toHaveLength(4);
    expect(media.every((item) => item.url.startsWith("/cars/") && existsSync(join(process.cwd(), "public", item.url)))).toBe(true);
  });
  it("publishes only exact high-confidence evidence and makes unknown/conflict NO_CLAIM by absence", () => {
    const artifact = buildVariantContentArtifact({ variant, catalogRelease: "v1", catalogFingerprint: "sha256:catalog" });
    expect(artifact.facts.map((item) => item.key)).toContain("range"); expect(artifact.facts.map((item) => item.key)).not.toContain("luggage");
    expect(artifact.equipment.map((item) => item.key)).toEqual(["REAR_CAMERA"]); expect(artifact.colors).toEqual([]); expect(artifact.video).toBeUndefined();
    expect(() => validateVariantContentArtifact(artifact, { exactVariantId: "exact-1", catalogRelease: "v1", catalogFingerprint: "sha256:catalog" })).not.toThrow();
  });
  it("publishes Turkish meaning and daily-use copy for every active catalog equipment code", async () => {
    const catalog = await evaluateV3Catalog([]);
    const codes = [...new Set(catalog.variants.flatMap((item) => item.decisionFacts.safetyFeatureCodes.filter((fact) => fact.confidence === "HIGH").map((fact) => fact.value)))];
    expect(codes.length).toBeGreaterThan(40);
    for (const code of codes) {
      expect(getEquipmentPublicCopy(code), code).toEqual(expect.objectContaining({ label: expect.any(String), dailyMeaning: expect.any(String) }));
    }
  });
  it("adds concrete daily-use examples and expanded equipment explanations to the public artifact", () => {
    const artifact = buildVariantContentArtifact({ variant, catalogRelease: "v1", catalogFingerprint: "sha256:catalog" });
    expect(artifact.facts.find((item) => item.key === "range")?.dailyExample).toMatch(/planlanan rota/iu);
    expect(artifact.equipment.find((item) => item.key === "REAR_CAMERA")).toMatchObject({
      value: "Geri görüş kamerası",
      dailyMeaning: expect.stringMatching(/geri manevrada/iu),
    });
  });
  it("rejects checksum and catalog/variant binding changes", () => {
    const artifact = buildVariantContentArtifact({ variant, catalogRelease: "v1", catalogFingerprint: "sha256:catalog" });
    expect(() => validateVariantContentArtifact({ ...artifact, title: "Değişti" }, { exactVariantId: "exact-1", catalogRelease: "v1", catalogFingerprint: "sha256:catalog" })).toThrow("CHECKSUM");
    expect(() => validateVariantContentArtifact(artifact, { exactVariantId: "other", catalogRelease: "v1", catalogFingerprint: "sha256:catalog" })).toThrow("BINDING");
  });
  it("rejects non-governed video embeds", () => {
    const artifact = buildVariantContentArtifact({ variant, catalogRelease: "v1", catalogFingerprint: "sha256:catalog" });
    const unsafe = { ...artifact, video: { provider: "YOUTUBE" as const, sourceUrl: "https://youtube.com/watch?v=abc", embedUrl: "https://evil.test/embed/abc", title: "Video", disposition: "VERIFIED" as const } };
    expect(() => validateVariantContentArtifact({ ...unsafe, checksum: artifact.checksum }, { exactVariantId: "exact-1", catalogRelease: "v1", catalogFingerprint: "sha256:catalog" })).toThrow();
  });
});
