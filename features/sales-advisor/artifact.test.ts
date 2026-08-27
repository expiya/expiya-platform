import { describe, expect, it } from "vitest";
import type { CatalogFact, CatalogVariantSnapshot } from "@/features/decision/v2/catalog/types";
import { buildVariantContentArtifact, validateVariantContentArtifact } from "./artifact.server";
import { getReviewedSalesColors } from "./salesKnowledge.server";

const provenance = [{ sourceId: "SRC-1", sourceUrl: "https://example.test/official", accessedAt: "2026-08-20T00:00:00.000Z", extractionMethod: "MANUAL" as const, confidence: "HIGH" as const, limitations: [] }];
const f = <T,>(value: T, confidence: "HIGH" | "MEDIUM" = "HIGH"): CatalogFact<T> => ({ value, confidence, provenance, catalogFingerprint: "sha256:catalog", explanationAccess: "AUTHORITY_REQUIRED" });
const variant: CatalogVariantSnapshot = { id: "exact-1", market: "TR", lifecycleStatus: "ON_SALE", brand: "Örnek", model: "Model", trim: "Plus", identityProvenance: provenance, decisionFacts: { bodyStyle: f("SUV"), modelYear: f(2026), powertrain: { fuelType: f("BEV"), powerKw: f(150), transmission: f("Automatic"), torqueNm: f(300, "MEDIUM") }, dimensions: { seats: f(5), luggageLitres: f(420, "MEDIUM") }, efficiency: { electricRangeKm: f(480), maxDcChargeKw: f(150) }, safetyFeatureCodes: [f("REAR_CAMERA"), f("UNKNOWN_CONFLICT", "MEDIUM")] } };

describe("versioned variant content artifact", () => {
  it("publishes market/model-year scoped Jogger colors for every matching variant", () => {
    const colors = getReviewedSalesColors({ brand: "Dacia", model: "Jogger", modelYear: 2026 });
    expect(colors.map((item) => item.value)).toEqual(["Beyaz", "Mineral Gri", "Kum Beji", "Sedir Yeşili", "Terracotta Kahve", "Duman Gri", "Siyah"]);
    expect(colors.every((item) => item.disposition === "FAMILY_LEVEL" && item.source?.url.includes("dacia.com.tr"))).toBe(true);
    expect(colors.every((item) => item.visual?.swatchHex.startsWith("#") && item.visual.approximation)).toBe(true);
    expect(getReviewedSalesColors({ brand: "Dacia", model: "Jogger", modelYear: 2025 })).toEqual([]);
  });
  it("publishes only exact high-confidence evidence and makes unknown/conflict NO_CLAIM by absence", () => {
    const artifact = buildVariantContentArtifact({ variant, catalogRelease: "v1", catalogFingerprint: "sha256:catalog" });
    expect(artifact.facts.map((item) => item.key)).toContain("range"); expect(artifact.facts.map((item) => item.key)).not.toContain("luggage");
    expect(artifact.equipment.map((item) => item.key)).toEqual(["REAR_CAMERA"]); expect(artifact.colors).toEqual([]); expect(artifact.video).toBeUndefined();
    expect(() => validateVariantContentArtifact(artifact, { exactVariantId: "exact-1", catalogRelease: "v1", catalogFingerprint: "sha256:catalog" })).not.toThrow();
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
