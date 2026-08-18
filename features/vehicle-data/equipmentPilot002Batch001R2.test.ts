import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { validateEquipmentEvidenceLocatorAgainstArtifact, validateReviewEvents } from "./equipmentCollectionProtocol";
import { projectEquipmentEvidence } from "./projectEquipmentEvidence";
import { validateAssertionSupersessions, validateDerivedArtifactProvenance, validateTrimLinkSupersessions } from "./validateEquipmentEvidenceLayer";
import { EQUIPMENT_FEATURE_CODES, type EquipmentEvidenceAssertion, type EquipmentReviewEvent, type EquipmentTrimVariantLink } from "@/types/equipmentEvidence";

const ROOT = process.cwd(), BASE = "data/production/equipment-evidence/working/EE-PILOT-002/EE-PILOT-002-BATCH-001";
const R1 = `${BASE}/corrections/EE-PILOT-002-CYCLE-001-R1`, R2 = `${BASE}/corrections/EE-PILOT-002-CYCLE-001-R2`;
const IBRIDA = "1a3cc01d-3bfa-56f3-817f-4cc77e723ef8", ELETTRICA = "5a64b246-3b05-52b6-9f24-b8f52ccc2305";
const read = <T>(file: string): T => JSON.parse(readFileSync(path.join(ROOT, file), "utf8")) as T;
const fileSha = (file: string) => createHash("sha256").update(readFileSync(path.join(ROOT, file))).digest("hex");
const stableRowId = (rawText: string) => `EE-SROW-${createHash("sha256").update(["TR", "Alfa Romeo", "Junior", "Ibrida Hybrid 145 eDCT6", "Speciale+", rawText].join("\u001f")).digest("hex").slice(0, 20).toUpperCase()}`;
const original = read<EquipmentEvidenceAssertion[]>(`${BASE}/assertions.json`), r1 = read<EquipmentEvidenceAssertion[]>(`${R1}/assertions.json`), r2 = read<EquipmentEvidenceAssertion[]>(`${R2}/assertions.json`);
const originalLinks = read<EquipmentTrimVariantLink[]>(`${BASE}/trim-links.json`), r1Links = read<EquipmentTrimVariantLink[]>(`${R1}/trim-links.json`), r2Links = read<EquipmentTrimVariantLink[]>(`${R2}/trim-links.json`);
const derivedRaw = readFileSync(path.join(ROOT, R2, "equipment-speciale-plus.source-rows.v2.json"), "utf8");
const derived = JSON.parse(derivedRaw) as { sourceRowOrder: string[]; sourceRowsById: Record<string, { sourceRowId: string; rawText: string; normalizedText: string; occurrenceCount: number; rawOccurrenceReferences: string[] }> };

describe("EE-PILOT-002 Batch 001-R2 source-row separation", () => {
  it("keeps the R1 correction and its review result immutable", () => {
    expect(fileSha(`${R1}/assertions.json`)).toBe("ae3d0e0c85d678fa403bde817015d760d7835313631bf1038e43cc44d301ad1a");
    expect(fileSha(`${R1}/research-ledger.json`)).toBe("940c864f8ce0c58dd698e347ca8946692da2de9f5f09c293e07b820adea61fe2");
    expect(fileSha(`${R1}/trim-links.json`)).toBe("98578fca62ad9f052187f65111bf6822682e1e161ed7aca9f6947af16a92946a");
    expect(fileSha(`${R1}/second-review/second-review-results.json`)).toBe("2b8b30c6432b9bbdefa2607baef66abd56d4991f11efc5b2c4b98656f18b9743");
    expect(fileSha(`${R1}/second-review/second-review-events.json`)).toBe("86a72c592730eaf96889db5d5c7d4b6fad9d5a3cf0ef54abf5c527fb6f9b6cd8");
  });

  it("contains exactly 16 stable source rows and no controlled feature code", () => {
    expect(derived.sourceRowOrder).toHaveLength(16); expect(Object.keys(derived.sourceRowsById)).toHaveLength(16);
    expect(new Set(derived.sourceRowOrder).size).toBe(16);
    for (const [id, row] of Object.entries(derived.sourceRowsById)) { expect(id).toBe(row.sourceRowId); expect(id).toBe(stableRowId(row.rawText)); expect(row.normalizedText).toBe(row.rawText.normalize("NFKC").replaceAll(/\s+/gu, " ").trim()); }
    for (const code of EQUIPMENT_FEATURE_CODES) expect(derivedRaw).not.toContain(code);
    expect(derivedRaw).not.toContain("equipmentByFeature"); expect(derivedRaw).not.toMatch(/STANDARD|OPTIONAL|PACKAGE_DEPENDENT|decisionUse/u);
  });

  it("preserves raw duplicate occurrence counts and references", () => {
    const rows = Object.values(derived.sourceRowsById);
    expect(rows.reduce((sum, row) => sum + row.occurrenceCount, 0)).toBe(34);
    expect(rows.filter((row) => row.occurrenceCount === 1)).toHaveLength(3);
    expect(rows.filter((row) => row.occurrenceCount === 2)).toHaveLength(8);
    expect(rows.filter((row) => row.occurrenceCount === 3)).toHaveLength(5);
    expect(rows.every((row) => row.rawOccurrenceReferences.length === row.occurrenceCount)).toBe(true);
  });

  it("proves raw-to-derived fidelity inside the exact Ibrida boundary", () => {
    const fidelity = read<{ rows: { sourceRowId: string; result: string; boundaryOccurrenceCount: number; rawOccurrenceCount: number }[]; duplicateRemovalRule: string }>(`${R2}/raw-to-derived-fidelity.json`);
    expect(fidelity.rows).toHaveLength(16); expect(fidelity.rows.every((row) => ["EXACT_RAW_MATCH", "NORMALIZATION_ONLY"].includes(row.result) && row.boundaryOccurrenceCount === 1 && row.rawOccurrenceCount >= 1)).toBe(true);
    expect(fidelity.duplicateRemovalRule).toBe("BYTE_OR_NORMALIZED_TEXT_EQUIVALENCE_ONLY");
  });

  it("stores 24 semantic mappings separately with explicit 16-to-24 fan-out", () => {
    const mappings = read<{ mappingId: string; sourceRowId: string; featureCode: string; sourcePhrase: string; mappingState: string; mappingReasonCode: string }[]>(`${R2}/semantic-mappings.json`);
    expect(mappings).toHaveLength(24); expect(new Set(mappings.map((item) => item.mappingId)).size).toBe(24);
    expect(mappings.every((item) => derived.sourceRowsById[item.sourceRowId]?.rawText === item.sourcePhrase && item.mappingState === "PROVISIONAL" && item.mappingReasonCode.length > 0)).toBe(true);
    const carplay = mappings.filter((item) => item.sourcePhrase === "Kablosuz Apple CarPlay ve Android Auto™ desteği"); expect(carplay).toHaveLength(4); expect(new Set(carplay.map((item) => item.sourceRowId)).size).toBe(1);
    expect(new Set(mappings.map((item) => item.sourceRowId)).size).toBe(16);
  });

  it("separates raw official provenance from the derived index on all R2 assertions", () => {
    expect(r2).toHaveLength(24);
    for (const item of r2) {
      expect(item.source).toMatchObject({ sourceId: "SRC-000086", artifactReference: "data/cars/vehicle_evidence/source_snapshots/SRC-000086/2026-08-18/source.html", artifactSha256: "sha256:3ab39031195955489bd984c432b469943ebb420b7d11ad4f8f4ec22d6661f955" });
      expect(item.derivedArtifact).toMatchObject({ parentSourceId: "SRC-000086", parentArtifactReference: item.source.artifactReference, parentArtifactSha256: item.source.artifactSha256, extractionPolicyId: "ALFA_ROMEO_TR_EXACT_TRIM_SOURCE_ROWS", extractionPolicyVersion: "2.0.0" });
      expect(validateDerivedArtifactProvenance(item, derivedRaw)).toEqual([]);
    }
    const broken: EquipmentEvidenceAssertion = { ...r2[0]!, derivedArtifact: { ...r2[0]!.derivedArtifact!, parentSourceId: "SRC-OTHER", parentArtifactSha256: `sha256:${"0".repeat(64)}` as `sha256:${string}`, artifactSha256: `sha256:${"1".repeat(64)}` as `sha256:${string}` } };
    expect(validateDerivedArtifactProvenance(broken, derivedRaw).map((item) => item.code)).toEqual(expect.arrayContaining(["DERIVED_PARENT_SOURCE_MISMATCH", "DERIVED_PARENT_HASH_MISMATCH", "DERIVED_ARTIFACT_HASH_MISMATCH"]));
  });

  it("resolves 24 locators to stable source-row IDs without feature codes in paths", () => {
    const mappings = read<{ mappingId: string; sourceRowId: string; featureCode: string }[]>(`${R2}/semantic-mappings.json`);
    for (const item of r2) {
      expect(validateEquipmentEvidenceLocatorAgainstArtifact(item.locator, derivedRaw)).toEqual([]);
      expect(item.locator.kind).toBe("STRUCTURED_RECORD");
      const mapping = mappings.find((entry) => entry.mappingId === item.semanticMappingId)!;
      expect((item.locator as { recordPath: string }).recordPath).toBe(`$.sourceRowsById.${mapping.sourceRowId}`);
      expect((item.locator as { recordPath: string }).recordPath).not.toContain(item.featureCode);
    }
  });

  it("forms 24 original-to-R1-to-R2 assertion chains and stays fail-closed", () => {
    expect(validateAssertionSupersessions([...original, ...r1, ...r2])).toEqual([]);
    for (const terminal of r2) { const middle = r1.find((item) => item.assertionId === terminal.supersedesAssertionId)!; expect(middle.supersedesAssertionId).toBeTruthy(); expect(original.some((item) => item.assertionId === middle.supersedesAssertionId && item.featureCode === terminal.featureCode)).toBe(true); }
    const feature = r2[0]!.featureCode, chain = [...original, ...r1, ...r2].filter((item) => item.featureCode === feature).map((item) => item === r2.find((x) => x.featureCode === feature) ? item : { ...item, verificationState: "VERIFIED" as const });
    expect(projectEquipmentEvidence({ variant: { exactVariantId: IBRIDA, modelYear: 2026, market: "TR" }, featureCode: feature, assertions: chain, packageLinks: [], trimLinks: [] })).toBeUndefined();
    expect(projectEquipmentEvidence({ variant: { exactVariantId: IBRIDA, modelYear: 2026, market: "TR" }, featureCode: feature, assertions: [...chain].reverse(), packageLinks: [], trimLinks: [] })).toBeUndefined();
  });

  it("forms the original-to-R1-to-R2 provisional trim-link chain", () => {
    expect(r2Links).toHaveLength(1); expect(r2Links[0]!.supersedesTrimLinkId).toBe(r1Links[0]!.linkId); expect(r1Links[0]!.supersedesTrimLinkId).toBe(originalLinks.find((item) => item.exactVariantId === IBRIDA)!.linkId);
    expect(r2Links[0]).toMatchObject({ exactVariantId: IBRIDA, canonicalTrimId: r1Links[0]!.canonicalTrimId, verificationState: "PROVISIONAL" });
    expect(validateTrimLinkSupersessions([...originalLinks, ...r1Links, ...r2Links])).toEqual([]);
  });

  it("keeps Elettrica isolated and creates 25 collector-only review subjects", () => {
    expect(r2.some((item) => item.exactVariantId === ELETTRICA)).toBe(false); expect(r2Links.some((item) => item.exactVariantId === ELETTRICA)).toBe(false);
    expect(fileSha("data/cars/vehicle_evidence/source_snapshots/SRC-000084/2026-08-18/source.html")).toBe("a97340845586845dfd6e6f84f5e2d0a351c6910678c544d860357ec631dc338b");
    const events = read<EquipmentReviewEvent[]>(`${R2}/review-events.json`); expect(events).toHaveLength(50); expect(new Set(events.map((item) => `${item.subjectType}|${item.subjectId}`)).size).toBe(25); expect(validateReviewEvents(events, r2)).toEqual([]); expect(events.every((item) => item.actorRole === "EQUIPMENT_COLLECTOR_PRIMARY" && !["SECOND_REVIEW_PASSED", "APPROVED"].includes(item.toState))).toBe(true);
  });
});
