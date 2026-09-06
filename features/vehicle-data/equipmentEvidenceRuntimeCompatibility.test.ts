import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  parseEquipmentReviewedAssociationCandidate,
  parseEquipmentReviewedAssociationManifest,
  validateEquipmentReviewedAssociationCompatibility,
} from "./equipmentReviewedAssociationAdapter";

const ROOT = process.cwd();
const V155 = "data/production/equipment-evidence/releases/v1.5.5-catalog-v0.55.4-2026-08-20";
const V160 = "data/production/equipment-evidence/releases/v1.6.0-owner-reviewed-manual-bridges-catalog-v0.55.4-2026-09-04";
const CATALOG_FINGERPRINT = "sha256:4330b3038b417b13f31a8359a9914509625b70771abbe931327901f0c37eb3b9";
const readRaw = (relative: string) => readFileSync(path.join(ROOT, relative), "utf8");
const read = <T>(relative: string): T => JSON.parse(readRaw(relative)) as T;
const sha = (relative: string) => `sha256:${createHash("sha256").update(readFileSync(path.join(ROOT, relative))).digest("hex")}`;
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const catalogIds = read<{ records: Array<{ variant: { id: string } }> }>("data/production/catalog/releases/v0.55.4/catalog.json").records.map((row) => row.variant.id);
const loadRelease = (base: string) => {
  const rawPayload = readRaw(`${base}/equipment-evidence.json`);
  const input = JSON.parse(rawPayload) as unknown;
  const manifestInput = read<unknown>(`${base}/manifest.json`);
  return {
    input,
    manifestInput,
    rawPayload,
    candidate: parseEquipmentReviewedAssociationCandidate(input),
    manifest: parseEquipmentReviewedAssociationManifest(manifestInput),
  };
};
const v155 = loadRelease(V155);
const v160 = loadRelease(V160);
const compatibility = (release: typeof v155, overrides: Partial<Parameters<typeof validateEquipmentReviewedAssociationCompatibility>[0]> = {}) =>
  validateEquipmentReviewedAssociationCompatibility({ candidate: release.candidate, manifest: release.manifest, rawPayload: release.rawPayload,
    catalogRelease: "v0.55.4", catalogFingerprint: CATALOG_FINGERPRINT, catalogVariantIds: catalogIds, ...overrides });

describe("Equipment v1.6 compact runtime compatibility", () => {
  it("normalizes schema 1.2.0-rc and 1.3.0 without changing source values", () => {
    expect(v155.candidate).toEqual(v155.input);
    expect(v160.candidate).toEqual(v160.input);
    expect(compatibility(v155)).toEqual([]);
    expect(compatibility(v160)).toEqual([]);
  });

  it("keeps the active v1.5.5 bytes and runtime metrics unchanged", () => {
    expect(sha("data/production/equipment-evidence/active.json")).toBe("sha256:101803fb4195c8cfe724715ece539d5ba88fb797f6a0194657b2166043feee4b");
    expect(sha("data/production/equipment-evidence/activeEquipmentEvidence.generated.ts")).toBe("sha256:e282e22700252fd0fe9b45d36be2c2c4953beb916367e8e390dbbb1977466396");
    expect(sha(`${V155}/equipment-evidence.json`)).toBe("sha256:0135bbfee468fa955d3d00d3129e0e7e01dae7bf9a980488450d8319ddc98d2e");
    expect([v155.candidate.verifiedAssertions.length, new Set(v155.candidate.verifiedAssertions.map((row) => row.exactVariantId)).size,
      new Set([...v155.candidate.verifiedAssertions, ...v155.candidate.reviewedAssociations].map((row) => row.exactVariantId)).size])
      .toEqual([112, 4, 6]);
  });

  it("admits the reviewed v1.6 metrics while leaving the candidate inactive", () => {
    const verified = new Set(v160.candidate.verifiedAssertions.map((row) => row.exactVariantId));
    const covered = new Set([...v160.candidate.verifiedAssertions, ...v160.candidate.reviewedAssociations].map((row) => row.exactVariantId));
    expect({ assertions: v160.candidate.verifiedAssertions.length, exactVerifiedVariants: verified.size, coveredVariants: covered.size,
      projections: v160.candidate.projections.length, uncovered: v160.candidate.coverage.uncoveredCoverage.exactVariantCount })
      .toEqual({ assertions: 126, exactVerifiedVariants: 8, coveredVariants: 10, projections: 126, uncovered: 539 });
    expect(read<{ activeEquipmentEvidenceRelease: string }>("data/production/equipment-evidence/active.json").activeEquipmentEvidenceRelease)
      .toBe("v1.5.5-catalog-v0.55.4-2026-08-20");
  });

  it("proves v1.6 is additive and preserves every v1.5.5 compact row", () => {
    for (const key of ["featureDefinitions", "intentAliases", "reviewedAssociations", "verifiedTrimLinks"] as const) expect(v160.candidate[key]).toEqual(v155.candidate[key]);
    const oldAssertions = new Map(v155.candidate.verifiedAssertions.map((row) => [row.materializationId, row]));
    const oldProjections = new Map(v155.candidate.projections.map((row) => [row.assertionMaterializationId, row]));
    expect(v160.candidate.verifiedAssertions.filter((row) => oldAssertions.has(row.materializationId)).every((row) => JSON.stringify(row) === JSON.stringify(oldAssertions.get(row.materializationId)))).toBe(true);
    expect(v160.candidate.projections.filter((row) => oldProjections.has(row.assertionMaterializationId)).every((row) => JSON.stringify(row) === JSON.stringify(oldProjections.get(row.assertionMaterializationId)))).toBe(true);
    expect(v160.candidate.verifiedAssertions.filter((row) => !oldAssertions.has(row.materializationId))).toHaveLength(14);
  });

  it("binds every added assertion to the reviewed auxiliary materializations and manifest digests", () => {
    const materializations = read<typeof v160.candidate.verifiedAssertions>(`${V160}/verified-association-materializations.json`);
    const ownerEvents = read<Array<{ eventId: string; proposalId: string; exactVariantId: string; featureCode: string; action: string; decisionAuthority: string }>>(`${V160}/owner-decision-events.json`);
    const oldIds = new Set(v155.candidate.verifiedAssertions.map((row) => row.materializationId));
    const added = v160.candidate.verifiedAssertions.filter((row) => !oldIds.has(row.materializationId));
    expect(added).toEqual(materializations);
    expect(added.every((row) => ownerEvents.some((event) => event.eventId === row.ownerApprovalEventId && event.proposalId === row.sourceAssertionId
      && event.exactVariantId === row.exactVariantId && event.featureCode === row.featureCode && event.action === "APPROVED"
      && event.decisionAuthority === "SHADOW_AND_EXPLANATION_DISABLED"))).toBe(true);
    const files = read<{ files: Array<{ path: string; sha256: string }> }>(`${V160}/manifest.json`).files;
    expect(files.every((file) => sha(`${V160}/${file.path}`) === file.sha256)).toBe(true);
  });

  it("rejects unknown future schemas and malformed compact provenance", () => {
    expect(() => parseEquipmentReviewedAssociationCandidate({ ...(v160.input as object), schemaVersion: "1.4.0" })).toThrow();
    const malformed = clone(v160.candidate) as unknown as { verifiedAssertions: Array<Record<string, unknown>> };
    delete malformed.verifiedAssertions[0].rawSourceReferences;
    delete malformed.verifiedAssertions[0].sourceReferences;
    expect(() => parseEquipmentReviewedAssociationCandidate(malformed)).toThrow(/ASSERTION_SOURCE_PROVENANCE_MISSING/u);
  });

  it("rejects duplicates, cross-variant references, digest mismatch, and semantic loss", () => {
    const duplicate = clone(v160.candidate);
    duplicate.verifiedAssertions[1].materializationId = duplicate.verifiedAssertions[0].materializationId;
    expect(compatibility(v160, { candidate: duplicate })).toContainEqual(expect.objectContaining({ code: "DUPLICATE_MATERIALIZATION_ID" }));

    const crossVariant = clone(v160.candidate);
    crossVariant.projections[0].exactVariantId = crossVariant.projections.find((row) => row.exactVariantId !== crossVariant.projections[0].exactVariantId)!.exactVariantId;
    expect(compatibility(v160, { candidate: crossVariant })).toContainEqual(expect.objectContaining({ code: "PROJECTION_ASSERTION_CROSS_VARIANT_REFERENCE" }));

    const badManifest = { ...v160.manifest, payloadSha256: `sha256:${"0".repeat(64)}` as const };
    expect(compatibility(v160, { manifest: badManifest })).toContainEqual(expect.objectContaining({ code: "PAYLOAD_CHECKSUM_MISMATCH" }));

    const semanticLoss = clone(v160.candidate);
    semanticLoss.projections[0].availabilityStatus = semanticLoss.projections[0].availabilityStatus === "STANDARD" ? "NOT_AVAILABLE" : "STANDARD";
    expect(compatibility(v160, { candidate: semanticLoss })).toContainEqual(expect.objectContaining({ code: "PROJECTION_ASSERTION_SEMANTIC_LOSS" }));

    const omittedProvision = clone(v160.candidate);
    delete omittedProvision.projections.find((row) => row.provisionMode)!.provisionMode;
    expect(compatibility(v160, { candidate: omittedProvision })).toContainEqual(expect.objectContaining({ code: "PROJECTION_ASSERTION_SEMANTIC_LOSS" }));
  });

  it("keeps all equipment decision and commerce effects disabled", () => {
    expect((Object.values(v160.candidate.decisionControls) as unknown[]).filter((value) => value === true)).toEqual([]);
    expect(v160.candidate.projections.every((row) => !row.familyInheritance && !row.crossPowertrainPropagation && !row.evidenceReinterpretation
      && row.decisionAuthority === "SHADOW_AND_EXPLANATION_DISABLED")).toBe(true);
    expect(v160.candidate.reviewedAssociations.every((row) => row.decisionUse === "CONFIRMATION_REQUIRED" && row.provisionKnowledge === "PROVISION_UNRESOLVED")).toBe(true);
  });
});
