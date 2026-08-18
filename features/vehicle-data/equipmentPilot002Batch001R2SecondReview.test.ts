import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { validateEquipmentEvidenceLocatorAgainstArtifact } from "./equipmentCollectionProtocol";
import { validateAssertionSupersessions, validateDerivedArtifactProvenance, validateTrimLinkSupersessions } from "./validateEquipmentEvidenceLayer";
import { EQUIPMENT_FEATURE_CODES, type EquipmentEvidenceAssertion, type EquipmentTrimVariantLink } from "@/types/equipmentEvidence";

const ROOT = process.cwd(), BASE = "data/production/equipment-evidence/working/EE-PILOT-002/EE-PILOT-002-BATCH-001", R1 = `${BASE}/corrections/EE-PILOT-002-CYCLE-001-R1`, R2 = `${BASE}/corrections/EE-PILOT-002-CYCLE-001-R2`, REVIEW = `${R2}/second-review`;
const read = <T>(file: string): T => JSON.parse(readFileSync(path.join(ROOT, file), "utf8")) as T;
const rawFile = (file: string) => readFileSync(path.join(ROOT, file));
const sha = (file: string) => createHash("sha256").update(rawFile(file)).digest("hex");
const original = read<EquipmentEvidenceAssertion[]>(`${BASE}/assertions.json`), r1 = read<EquipmentEvidenceAssertion[]>(`${R1}/assertions.json`), r2 = read<EquipmentEvidenceAssertion[]>(`${R2}/assertions.json`);
const originalLinks = read<EquipmentTrimVariantLink[]>(`${BASE}/trim-links.json`), r1Links = read<EquipmentTrimVariantLink[]>(`${R1}/trim-links.json`), r2Links = read<EquipmentTrimVariantLink[]>(`${R2}/trim-links.json`);
const derivedRaw = rawFile(`${R2}/equipment-speciale-plus.source-rows.v2.json`).toString("utf8");
const derived = JSON.parse(derivedRaw) as { sourceRowOrder: string[]; sourceRowsById: Record<string, { rawText: string; normalizedText: string; occurrenceCount: number; rawOccurrenceReferences: string[] }> };

describe("EE-PILOT-002 Batch 001-R2 final independent second review", () => {
  it("preserves immutable history and source snapshots", () => {
    expect(sha(`${BASE}/assertions.json`)).toBe("d71484a96009d93756ba7843393bb441c88cea798a32ab240edb0ee41407bb35");
    expect(sha(`${BASE}/second-review-events.json`)).toBe("249cd53be1c6d141f83d915a29acbe3d978f6aeabf3b66aaa8b50bec8fbe8c35");
    expect(sha(`${R1}/assertions.json`)).toBe("ae3d0e0c85d678fa403bde817015d760d7835313631bf1038e43cc44d301ad1a");
    expect(sha(`${R1}/second-review/second-review-events.json`)).toBe("86a72c592730eaf96889db5d5c7d4b6fad9d5a3cf0ef54abf5c527fb6f9b6cd8");
    expect(sha("data/cars/vehicle_evidence/source_snapshots/SRC-000086/2026-08-18/equipment-speciale-plus.derived.json")).toBe("7c4b9f8e7de95cfda4569b09f01bd0e362113b6a677a872ffea701e98cc09515");
    expect(sha("data/cars/vehicle_evidence/source_snapshots/SRC-000086/2026-08-18/source.html")).toBe("3ab39031195955489bd984c432b469943ebb420b7d11ad4f8f4ec22d6661f955");
    expect(sha("data/cars/vehicle_evidence/source_snapshots/SRC-000084/2026-08-18/source.html")).toBe("a97340845586845dfd6e6f84f5e2d0a351c6910678c544d860357ec631dc338b");
  });

  it("passes the 16-row, 34-occurrence source-only artifact", () => {
    expect(sha(`${R2}/equipment-speciale-plus.source-rows.v2.json`)).toBe("d082adfcd82a59f2bd3b52284b6bd143d9e37540dd3ace85b416ad149cfcf796");
    expect(derived.sourceRowOrder).toHaveLength(16); expect(Object.keys(derived.sourceRowsById)).toHaveLength(16);
    const rows = Object.values(derived.sourceRowsById); expect(rows.reduce((sum, row) => sum + row.occurrenceCount, 0)).toBe(34);
    expect([1, 2, 3].map((count) => rows.filter((row) => row.occurrenceCount === count).length)).toEqual([3, 8, 5]);
    for (const code of EQUIPMENT_FEATURE_CODES) expect(derivedRaw).not.toContain(code);
    expect(derivedRaw).not.toMatch(/equipmentByFeature|availabilityStatus|STANDARD|OPTIONAL/u);
    expect("™".normalize("NFKC")).toBe("TM");
  });

  it("passes all mappings, locators, provenance, and negative validator fixtures", () => {
    const mappings = read<{ mappingId: string; sourceRowId: string; featureCode: string; sourcePhrase: string }[]>(`${R2}/semantic-mappings.json`);
    expect(mappings).toHaveLength(24); expect(new Set(mappings.map((x) => `${x.sourceRowId}|${x.featureCode}`)).size).toBe(24);
    const counts = Object.values(mappings.reduce<Record<string, number>>((out, x) => ({ ...out, [x.sourceRowId]: (out[x.sourceRowId] ?? 0) + 1 }), {}));
    expect([1, 2, 3, 4].map((count) => counts.filter((x) => x === count).length)).toEqual([11, 3, 1, 1]);
    for (const assertion of r2) { expect(validateDerivedArtifactProvenance(assertion, derivedRaw)).toEqual([]); expect(validateEquipmentEvidenceLocatorAgainstArtifact(assertion.locator, derivedRaw)).toEqual([]); }
    const base = r2[0]!;
    expect(validateDerivedArtifactProvenance({ ...base, derivedArtifact: undefined }, derivedRaw).map((x) => x.code)).toContain("STRUCTURED_LOCATOR_DERIVED_ARTIFACT_REQUIRED");
    expect(validateDerivedArtifactProvenance({ ...base, derivedArtifact: { ...base.derivedArtifact!, parentSourceId: "BAD", parentArtifactSha256: `sha256:${"0".repeat(64)}`, extractionPolicyId: "", artifactSha256: `sha256:${"1".repeat(64)}` } }, derivedRaw).map((x) => x.code)).toEqual(expect.arrayContaining(["DERIVED_PARENT_SOURCE_MISMATCH", "DERIVED_PARENT_HASH_MISMATCH", "DERIVED_EXTRACTION_POLICY_MISSING", "DERIVED_ARTIFACT_HASH_MISMATCH"]));
  });

  it("passes 24 assertion and one trim-link terminal supersession chains", () => {
    expect(validateAssertionSupersessions([...original, ...r1, ...r2])).toEqual([]); expect(validateTrimLinkSupersessions([...originalLinks, ...r1Links, ...r2Links])).toEqual([]);
    expect(r2).toHaveLength(24); expect(r2.every((x) => x.verificationState === "PROVISIONAL" && x.conflictState === "CLEAR" && x.availabilityStatus === "STANDARD" && x.provisionMode === "INCLUDED")).toBe(true);
    expect(r2Links).toHaveLength(1); expect(r2Links[0]!.assertionIds).toHaveLength(24); expect(r2Links[0]!.assertionIds.every((id) => r2.some((x) => x.assertionId === id))).toBe(true);
  });

  it("serializes 25 append-only reviewer decisions and the accepted terminal view", () => {
    const events = read<{ subjectType: string; subjectId: string; fromState: string; toState: string; actorRole: string; actorInstanceId: string }[]>(`${REVIEW}/second-review-events.json`);
    const results = read<{ result: string; subjects: { total: number; passed: number } }>(`${REVIEW}/second-review-results.json`);
    const terminal = read<{ activePassedAssertions: { total: number }; activePassedTrimLinks: { total: number }; historicalConflictRecords: { originalAndR1IbridaAssertions: number; originalAndR1IbridaTrimLinks: number } }>(`${REVIEW}/terminal-batch-view.json`);
    const comparison = read<{ counts: Record<string, number> }>(`${REVIEW}/trim-comparison-r2-reviewed.json`);
    expect(events).toHaveLength(25); expect(new Set(events.map((x) => `${x.subjectType}|${x.subjectId}`)).size).toBe(25);
    expect(events.every((x) => x.fromState === "SECOND_REVIEW_REQUIRED" && x.toState === "SECOND_REVIEW_PASSED" && x.actorRole === "EQUIPMENT_REVIEWER_SECONDARY" && x.actorInstanceId === "ACTOR-REVIEWER-CODEX-EQUIPMENT-001")).toBe(true);
    expect(results).toMatchObject({ result: "ACCEPTED_PROVISIONAL_EVIDENCE", subjects: { total: 25, passed: 25 } });
    expect(terminal).toMatchObject({ activePassedAssertions: { total: 47 }, activePassedTrimLinks: { total: 2 }, historicalConflictRecords: { originalAndR1IbridaAssertions: 48, originalAndR1IbridaTrimLinks: 2 } });
    expect(comparison.counts).toEqual({ CONFIRMED_SAME: 23, CONFIRMED_DIFFERENT: 0, INCONCLUSIVE_FOR_ONE: 1, INCONCLUSIVE_FOR_BOTH: 27, CONFLICTING: 0 });
  });
});
