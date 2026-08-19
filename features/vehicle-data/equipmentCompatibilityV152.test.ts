import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const BASE = "data/production/equipment-evidence/releases/v1.5.2-catalog-v0.55.3-2026-08-19";
const read = <T>(file: string) => JSON.parse(readFileSync(path.join(ROOT, file), "utf8")) as T;
const sha = (file: string) => `sha256:${createHash("sha256").update(readFileSync(path.join(ROOT, file))).digest("hex")}`;
type ExactItem = { exactVariantId: string };
type Coverage = { catalogVariantCount: number; verifiedAssertionCoverage: { exactVariantCount: number; exactVariantIds: string[] }; reviewedAssociationOnlyCoverage: { exactVariantCount: number; exactVariantIds: string[] }; uncoveredCoverage: { exactVariantCount: number }; coveredUniqueExactVariantCount: number };
type Payload = { compatibleCatalogFingerprint: string; coverage: Coverage; verifiedAssertions: ExactItem[]; reviewedAssociations: ExactItem[]; verifiedTrimLinks: ExactItem[]; projections: ExactItem[]; decisionAuthority: string; decisionControls: Record<string, unknown> };
type Manifest = { compatibleCatalogFingerprint: string; payloadSha256: string; releaseVersion: string };
const payload = read<Payload>(`${BASE}/equipment-evidence.json`);
const manifest = read<Manifest>(`${BASE}/manifest.json`);
const catalog = read<{ records: Array<{ variant: { id: string } }> }>("data/production/catalog/releases/0.55.3/catalog.json");
const quarantine = read<{ records: ExactItem[] }>("data/production/catalog/release-candidates/v0.55.3/quarantine-registry.json").records.map((x) => x.exactVariantId);

function validateCoverage(input: Payload, catalogIds = new Set(catalog.records.map((x) => x.variant.id))) {
  const issues: string[] = [];
  const verified = input.coverage.verifiedAssertionCoverage.exactVariantIds as string[];
  const associations = input.coverage.reviewedAssociationOnlyCoverage.exactVariantIds as string[];
  const covered = new Set([...verified, ...associations]);
  if (input.coverage.catalogVariantCount !== catalogIds.size) issues.push("CATALOG_TOTAL_MISMATCH");
  if (verified.some((id) => associations.includes(id))) issues.push("COVERAGE_SET_OVERLAP");
  if ([...covered].some((id) => !catalogIds.has(id))) issues.push("COVERED_ID_NOT_IN_CATALOG");
  if (input.coverage.uncoveredCoverage.exactVariantCount !== catalogIds.size - covered.size) issues.push("UNCOVERED_SET_DIFFERENCE_MISMATCH");
  if (verified.length + associations.length + input.coverage.uncoveredCoverage.exactVariantCount !== catalogIds.size) issues.push("COVERAGE_ARITHMETIC_INVALID");
  if (input.compatibleCatalogFingerprint !== manifest.compatibleCatalogFingerprint) issues.push("POINTER_OR_MANIFEST_FINGERPRINT_MISMATCH");
  return issues;
}

describe("Equipment v1.5.2 compatibility repair", () => {
  it("derives 4 + 2 + 543 from the pinned 549-record snapshot", () => {
    expect(payload.coverage).toMatchObject({ catalogVariantCount: 549, verifiedAssertionCoverage: { exactVariantCount: 4 }, reviewedAssociationOnlyCoverage: { exactVariantCount: 2 }, uncoveredCoverage: { exactVariantCount: 543 }, coveredUniqueExactVariantCount: 6 });
    expect(validateCoverage(payload)).toEqual([]);
  });
  it("rejects stale total and uncovered metadata before activation", () => {
    expect(validateCoverage({ ...payload, coverage: { ...payload.coverage, catalogVariantCount: 566 } })).toContain("CATALOG_TOTAL_MISMATCH");
    expect(validateCoverage({ ...payload, coverage: { ...payload.coverage, uncoveredCoverage: { exactVariantCount: 560 } } })).toContain("UNCOVERED_SET_DIFFERENCE_MISMATCH");
  });
  it("rejects overlap and covered IDs absent from catalog", () => {
    const verified = payload.coverage.verifiedAssertionCoverage.exactVariantIds;
    expect(validateCoverage({ ...payload, coverage: { ...payload.coverage, reviewedAssociationOnlyCoverage: { exactVariantCount: 2, exactVariantIds: [verified[0], "missing-id"] } } })).toEqual(expect.arrayContaining(["COVERAGE_SET_OVERLAP", "COVERED_ID_NOT_IN_CATALOG"]));
  });
  it("contains no quarantined evidence or coverage reference", () => {
    const values = [payload.verifiedAssertions, payload.reviewedAssociations, payload.verifiedTrimLinks, payload.projections].flat().map((x) => x.exactVariantId);
    const coverageIds = [...payload.coverage.verifiedAssertionCoverage.exactVariantIds, ...payload.coverage.reviewedAssociationOnlyCoverage.exactVariantIds];
    expect([...values, ...coverageIds].filter((id) => quarantine.includes(id))).toEqual([]);
  });
  it("rejects payload-pointer fingerprint disagreement", () => {
    expect(validateCoverage({ ...payload, compatibleCatalogFingerprint: "sha256:bad" })).toContain("POINTER_OR_MANIFEST_FINGERPRINT_MISMATCH");
  });
  it("keeps exact evidence counts and decision authority disabled", () => {
    expect([payload.verifiedAssertions.length, payload.reviewedAssociations.length, payload.verifiedTrimLinks.length, payload.projections.length]).toEqual([112, 49, 6, 112]);
    expect(payload.decisionAuthority).toBe("SHADOW_AND_EXPLANATION_DISABLED");
    expect(Object.values(payload.decisionControls).filter((x) => x === true)).toEqual([]);
  });
  it("binds payload, manifest, pointer and generated module consistently", () => {
    const pointer = read<{ payloadSha256: string; compatibleCatalogFingerprint: string }>(`${BASE}/proposed-active-pointer.json`);
    expect(manifest.payloadSha256).toBe(sha(`${BASE}/equipment-evidence.json`));
    expect(pointer.payloadSha256).toBe(manifest.payloadSha256);
    expect(pointer.compatibleCatalogFingerprint).toBe(manifest.compatibleCatalogFingerprint);
    const generatedModule = readFileSync(path.join(ROOT, `${BASE}/proposed-activeEquipmentEvidence.generated.ts.txt`), "utf8");
    expect(generatedModule).toContain(`/releases/${manifest.releaseVersion}/equipment-evidence.json`);
    expect(payload.coverage).toEqual(read<Coverage>(`${BASE}/coverage-report.json`));
  });
  it("records that the compatibility-repair step itself did not activate", () => {
    expect(read<{ activationPerformed: boolean }>(`${BASE}/manifest.json`).activationPerformed).toBe(false);
    expect(read<{ status: string }>(`${BASE}/deterministic-regeneration-report.json`).status).toBe("PASSED");
  });
});
