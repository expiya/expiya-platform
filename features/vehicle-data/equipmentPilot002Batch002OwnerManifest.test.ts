import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { associationApprovalManifestChecksum, validateAssociationApprovalManifest, type EquipmentAssociationOwnerApprovalManifest } from "./equipmentAssociationApprovalManifest";

const root = process.cwd(), id = "EE-OAM-B3CABECB69A55D4B6741";
const dir = path.join(root, "data/production/equipment-evidence/governance/approval-manifests", id);
const manifest = JSON.parse(readFileSync(path.join(dir, "approval-manifest.json"), "utf8")) as EquipmentAssociationOwnerApprovalManifest;
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

describe("Batch 002 owner approval manifest preparation", () => {
  it("contains exactly 49 observations and two trim links", () => {
    expect(manifest).toMatchObject({ manifestId: id, subjectCount: 51, observationCount: 49, trimLinkCount: 2 });
    expect(manifest.subjects.filter((item) => item.subjectType === "ASSOCIATION_OBSERVATION")).toHaveLength(49);
    expect(manifest.subjects.filter((item) => item.subjectType === "TRIM_LINK")).toHaveLength(2);
  });

  it("includes only allowed terminal subject types without duplicates", () => {
    expect(manifest.subjects.every((item) => ["ASSOCIATION_OBSERVATION", "TRIM_LINK"].includes(item.subjectType))).toBe(true);
    expect(new Set(manifest.subjects.map((item) => `${item.subjectType}:${item.subjectId}`)).size).toBe(51);
  });

  it("excludes transitions, conflicts, inconclusive rows, and lifecycle events from subjects", () => {
    expect(manifest.subjects.some((item) => item.subjectId.startsWith("EE-CORR") || item.subjectId.startsWith("EE-AST"))).toBe(false);
    expect(manifest.provenanceAppendix).toMatchObject({ inconclusiveLedgerRowCount: 53, collectorLifecycleEventCount: 196, independentReviewEventCount: 98 });
    expect(manifest.provenanceAppendix.correctionTransitionIds).toHaveLength(49);
    expect(manifest.provenanceAppendix.historicalAssertionIds).toHaveLength(49);
  });

  it("serializes observations without availability or provision claims", () => {
    const observations = manifest.subjects.filter((item) => item.subjectType === "ASSOCIATION_OBSERVATION");
    expect(observations.every((item) => item.observationType === "LISTED_FOR_EXACT_TRIM" && item.provisionKnowledge === "PROVISION_UNRESOLVED" && item.decisionUse === "CONFIRMATION_REQUIRED")).toBe(true);
    expect(observations.every((item) => !("availabilityStatus" in item) && !("provisionMode" in item) && !("standardOrOptional" in item))).toBe(true);
  });

  it("preserves Diesel Ti and Hybrid Speciale distributions", () => {
    const observations = manifest.subjects.filter((item) => item.subjectType === "ASSOCIATION_OBSERVATION");
    expect(observations.filter((item) => item.exactVariantId === "54bbe431-a3c2-56d0-8177-cefdf0330bcb")).toHaveLength(22);
    expect(observations.filter((item) => item.exactVariantId === "f12f742b-111c-54de-a006-61361fb1ae04")).toHaveLength(27);
  });

  it("binds catalog and R1 checksums", () => {
    expect(manifest.catalogFingerprint).toBe("sha256:fd5609adcc0ca3fec0f8c9dc4dd1c903ed5514326bd322eacd4decff5a044f0f");
    expect(manifest.r1Checksum).toBe("sha256:a9f3abbed2a6e173fe38afecdf55413ae568599d39c9ed27c2d5652208b6a519");
  });

  it("has a valid deterministic manifest checksum that changes with input", () => {
    const { manifestChecksum, ...payload } = manifest;
    expect(associationApprovalManifestChecksum(payload)).toBe(manifestChecksum);
    const changed = clone(payload);
    (changed as { generatedAt: string }).generatedAt = "2026-08-19T00:15:01.000Z";
    expect(associationApprovalManifestChecksum(changed)).not.toBe(manifestChecksum);
  });

  it("validates all 51 subjects as second-review passed", () => {
    const passed = new Set(manifest.subjects.map((item) => `${item.subjectType}:${item.subjectId}`));
    expect(validateAssociationApprovalManifest({ manifest, passedSubjectKeys: passed, ownerActorValid: true,
      expectedCatalogFingerprint: manifest.catalogFingerprint, expectedR1Checksum: manifest.r1Checksum })).toEqual([]);
  });

  it("rejects duplicate and non-passed subjects", () => {
    const duplicate = { ...clone(manifest), subjects: [manifest.subjects[0]!, ...manifest.subjects.slice(0, 50)] };
    const passed = new Set(manifest.subjects.map((item) => `${item.subjectType}:${item.subjectId}`));
    expect(validateAssociationApprovalManifest({ manifest: duplicate, passedSubjectKeys: passed, ownerActorValid: true,
      expectedCatalogFingerprint: manifest.catalogFingerprint, expectedR1Checksum: manifest.r1Checksum })).toContain("MANIFEST_DUPLICATE_SUBJECT");
  });

  it("binds an active Equipment-only owner distinct from collector/reviewer", () => {
    const registry = JSON.parse(readFileSync(path.join(root, "data/production/equipment-evidence/governance/actor-registry.json"), "utf8"));
    expect(registry.actors[0]).toMatchObject({ actorId: "EQUIPMENT_OWNER_001", status: "ACTIVE", scope: "EQUIPMENT_EVIDENCE_ONLY" });
    expect(registry.actors[0].actorId).not.toBe("ACTOR-COLLECTOR-CODEX-CATALOG-001");
    expect(registry.actors[0].actorId).not.toBe("ACTOR-REVIEWER-CODEX-EQUIPMENT-001");
  });

  it("prepares no approval event, materialization, or production release", () => {
    const result = JSON.parse(readFileSync(path.join(dir, "preparation-result.json"), "utf8"));
    expect(result).toMatchObject({ ownerApprovalEventsCreated: 0, materializationsCreated: 0, productionReleaseCreated: false, activePointerChanged: false });
  });

  it("records no activation during manifest preparation while preserving disabled authority", () => {
    expect(manifest.decisionAuthority).toBe("SHADOW_AND_EXPLANATION_DISABLED");
  });
});
