import { describe, expect, it } from "vitest";
import { assertOwnerManualCatalogCompatibility, canonicalJson, detectConditionalOwnerManualLanguage, ownerManualFingerprint, projectOwnerManualAssertion, validateOwnerManualAssertion } from "./ownerManualEvidence";
import { hasProvisionalOwnerManualEquipment } from "./ownerManualEvidenceProjection";
import type { OwnerManualAssertion } from "@/types/ownerManualEvidence";

const base: OwnerManualAssertion = {
  assertionId: "OM-AST-001", sourceId: "OM-SRC-001", featureCode: "POWER_SLIDING_SIDE_DOOR", normalizedValue: true,
  authorityLevel: "MODEL_FAMILY_CAPABILITY", polarity: "POSITIVE", confidence: "HIGH",
  applicability: { market: "GLOBAL", language: "en", modelFamily: "Berlingo", bodyConfigurations: ["MPV", "VAN"], powertrains: [], trims: [], vinSpecific: false, conditionalEquipment: false, observedAt: "2026-08-25T00:00:00.000Z" },
  provenance: { rawArtifactReference: "private://owner-manuals/berlingo.pdf", rawSha256: `sha256:${"a".repeat(64)}`, physicalPdfPage: 42, sectionHeading: "Sliding side door", extractionPolicyId: "OWNER_MANUAL_EXTRACTION_V4", extractionPolicyVersion: "4.0.0", reviewerDecision: "ACCEPTED" },
};

describe("owner manual evidence V4 authority", () => {
  it("detects conditional equipment language", () => {
    expect(detectConditionalOwnerManualLanguage("If fitted, press the button.")).toBe(true);
    expect(detectConditionalOwnerManualLanguage("Donanıma göre elektrikli kapı bulunabilir.")).toBe(true);
    expect(detectConditionalOwnerManualLanguage("Je nach Ausstattung ist eine elektrische Tür verfügbar.")).toBe(true);
    expect(detectConditionalOwnerManualLanguage("Se in dotazione, premere il pulsante.")).toBe(true);
    expect(detectConditionalOwnerManualLanguage("Open the door with the handle.")).toBe(false);
  });
  it("uses family capability as a provisional filter without promoting exact authority", () => expect(projectOwnerManualAssertion(base)).toMatchObject({ hardFilterEligible: false, filterEligible: true, softSignal: true, warning: expect.stringMatching(/doğrulanması gerekir/iu) }));
  it("allows a valid exact verified assertion to hard-filter", () => {
    const exact = { ...base, exactVariantId: "variant-1", authorityLevel: "EXACT_VARIANT_VERIFIED" as const, applicability: { ...base.applicability, market: "TR", trims: ["Max"], conditionalEquipment: false } };
    expect(validateOwnerManualAssertion(exact)).toEqual([]);
    expect(projectOwnerManualAssertion(exact).hardFilterEligible).toBe(true);
    expect(projectOwnerManualAssertion(exact).filterEligible).toBe(true);
  });
  it("never promotes a foreign-market manual to Turkey exact authority", () => {
    const ukExact = { ...base, exactVariantId: "variant-1", authorityLevel: "EXACT_VARIANT_VERIFIED" as const, applicability: { ...base.applicability, market: "GB", language: "en-GB" } };
    expect(validateOwnerManualAssertion(ukExact)).toContain("EXACT_AUTHORITY_REQUIRES_TR_MARKET");
    expect(projectOwnerManualAssertion(ukExact).hardFilterEligible).toBe(false);
  });
  it("rejects conditional exact projection and silent-absence negatives", () => {
    const conditional = { ...base, exactVariantId: "variant-1", authorityLevel: "EXACT_VARIANT_VERIFIED" as const, applicability: { ...base.applicability, conditionalEquipment: true } };
    expect(validateOwnerManualAssertion(conditional)).toContain("CONDITIONAL_EQUIPMENT_CANNOT_BE_EXACT_VERIFIED");
    expect(validateOwnerManualAssertion({ ...base, normalizedValue: false, polarity: "NEGATIVE" })).toContain("NEGATIVE_REQUIRES_EXACT_OFFICIAL_AUTHORITY");
  });
  it("regenerates byte-identically and fingerprints independent of key order", () => {
    expect(canonicalJson({ b: 2, a: 1 })).toBe('{"a":1,"b":2}');
    expect(ownerManualFingerprint({ b: 2, a: 1 })).toBe(ownerManualFingerprint({ a: 1, b: 2 }));
  });
  it("fails closed on a catalog fingerprint mismatch", () => expect(() => assertOwnerManualCatalogCompatibility({ catalogRelease: "v0.55.4", catalogFingerprint: "sha256:stale" }, { release: "v0.55.4", fingerprint: "sha256:active" })).toThrow("OWNER_MANUAL_CATALOG_FINGERPRINT_MISMATCH"));
  it("isolates closely named derivatives while retaining governed body aliases", () => {
    const authority = { catalogRelease: "v0.55.4", catalogFingerprint: "sha256:4330b3038b417b13f31a8359a9914509625b70771abbe931327901f0c37eb3b9" };
    expect(hasProvisionalOwnerManualEquipment({ ...authority, variant: { id: "velar", brand: "Land Rover", model: "Range Rover Velar" }, featureCode: "SPEED_LIMITER" })).toBe(false);
    expect(hasProvisionalOwnerManualEquipment({ ...authority, variant: { id: "range-rover", brand: "Land Rover", model: "Range Rover" }, featureCode: "SPEED_LIMITER" })).toBe(true);
    expect(hasProvisionalOwnerManualEquipment({ ...authority, variant: { id: "enyaq-coupe", brand: "Škoda", model: "Enyaq Coupe" }, featureCode: "DC_CHARGING_POWER" })).toBe(false);
    expect(hasProvisionalOwnerManualEquipment({ ...authority, variant: { id: "jumpy-van", brand: "Citroën", model: "Jumpy Van" }, featureCode: "ROOF_RAILS" })).toBe(true);
  });
});
