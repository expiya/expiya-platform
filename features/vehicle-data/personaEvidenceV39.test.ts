import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

import { personaEvidenceReleaseSchema, validatePersonaEvidenceRelease } from "./personaEvidenceV39";

const source = { sourceId: "SRC-1", url: "https://example.com/model", publisher: "Maker", title: "Model page", sourceType: "OFFICIAL_MARKET_PAGE", publicationDate: null, accessedAt: "2026-08-24T00:00:00.000Z", market: "TR", modelYearOrGeneration: "2026", authorityClass: "A1_OFFICIAL_MARKET", marketApplicability: "EXACT_TR_CATALOG", technicalAuthority: false } as const;
const family = { familyId: "family-1", canonicalBrand: "Brand", canonicalModel: "Model", exactVariantIds: ["variant-1"], sources: [source], claims: [{ claimId: "CLM-1", trait: "COMMERCIAL", neutralSummary: "Exact catalog use class is commercial.", sourceIds: ["SRC-1"], supportedSpanOrTimestamp: "catalog.records[variant-1].variant.vehicleUseClass", exactVariantIds: ["variant-1"], derivationPolicy: "EXACT_CATALOG_COMMERCIAL_ARCHITECTURE", conflictStatus: "NONE" }], proposedTraits: ["COMMERCIAL"], evidenceStatus: "SOURCE_BACKED", reviewStatus: "OWNER_REVIEW_REQUIRED", ownerDecision: null, contaminationChecks: { exactFamilyBound: true, generationVerified: true, marketVerified: true, crossMarketRejected: true } } as const;
const release = { schemaVersion: "3.9.0-rc.1", releaseVersion: "v3.9.0-rc.1", compatibleCatalogRelease: "v0.55.4", compatibleCatalogFingerprint: `sha256:${"a".repeat(64)}`, authority: "SOURCE_BACKED_OWNER_REVIEW", decisionUse: "BOUNDED_SOFT_RANKING_ONLY", scoreCap: 0.75, generatedAt: "2026-08-24T00:00:00.000Z", activationPerformed: false, ownerApproval: null, families: [family] } as const;

describe("persona evidence V3.9 governance", () => {
  it("accepts exact family-bound and market-verified evidence", () => expect(personaEvidenceReleaseSchema.safeParse(release).success).toBe(true));
  it("rejects source outage for a trait-bearing family", () => expect(personaEvidenceReleaseSchema.safeParse({ ...release, families: [{ ...family, sources: [] }] }).success).toBe(false));
  it("rejects generation mismatch for a trait-bearing family", () => expect(personaEvidenceReleaseSchema.safeParse({ ...release, families: [{ ...family, contaminationChecks: { ...family.contaminationChecks, generationVerified: false } }] }).success).toBe(false));
  it("rejects cross-market contamination", () => expect(personaEvidenceReleaseSchema.safeParse({ ...release, families: [{ ...family, contaminationChecks: { ...family.contaminationChecks, marketVerified: false } }] }).success).toBe(false));
  it("rejects a foreign editorial trait with fewer than two independent character-only sources", () => {
    const editorialSource = { ...source, sourceId: "ED-1", market: "UK", authorityClass: "B1_EDITORIAL", sourceType: "EDITORIAL_REVIEW", marketApplicability: "CHARACTER_ONLY_NO_EQUIPMENT_AUTHORITY" } as const;
    const editorialFamily = { ...family, sources: [editorialSource], claims: [{ ...family.claims[0], sourceIds: ["ED-1"], trait: "COMFORT", derivationPolicy: "EDITORIAL_CHARACTER_CONSENSUS" }], proposedTraits: ["COMFORT"] } as const;
    expect(personaEvidenceReleaseSchema.safeParse({ ...release, families: [editorialFamily] }).success).toBe(false);
  });
  it("rejects editorial consensus when both citations have the same publisher", () => {
    const editorialSource = { ...source, sourceId: "ED-1", publisher: "Publisher A", market: "UK", authorityClass: "B1_EDITORIAL", sourceType: "EDITORIAL_REVIEW", marketApplicability: "CHARACTER_ONLY_NO_EQUIPMENT_AUTHORITY" } as const;
    const duplicatePublisherSource = { ...editorialSource, sourceId: "ED-2", url: "https://example.com/second" } as const;
    const editorialFamily = { ...family, sources: [editorialSource, duplicatePublisherSource], claims: [{ ...family.claims[0], sourceIds: ["ED-1", "ED-2"], trait: "COMFORT", derivationPolicy: "EDITORIAL_CHARACTER_CONSENSUS" }], proposedTraits: ["COMFORT"] } as const;
    expect(personaEvidenceReleaseSchema.safeParse({ ...release, families: [editorialFamily] }).success).toBe(false);
  });
  it("detects missing family and variant coverage", () => {
    const errors = validatePersonaEvidenceRelease({ release, catalogFamilyVariantIds: new Map([["family-1", ["variant-1"]], ["family-2", ["variant-2"]]]), catalogVariantIds: ["variant-1", "variant-2"], catalogRelease: "v0.55.4", catalogFingerprint: `sha256:${"a".repeat(64)}` });
    expect(errors).toEqual(expect.arrayContaining(["FAMILY_COVERAGE_MISMATCH", "VARIANT_COVERAGE_MISMATCH"]));
  });
  it("keeps the V3.9 release candidate free of trait-empty active families", () => {
    const candidate = JSON.parse(readFileSync(path.join(process.cwd(), "data/production/personas/evidence/release-candidates/v3.9.0-catalog-v0.55.4-2026-08-24/persona-evidence.json"), "utf8")) as { families: Array<{ proposedTraits: string[] }> };
    expect(candidate.families.filter((candidateFamily) => candidateFamily.proposedTraits.length === 0)).toEqual([]);
  });
});
