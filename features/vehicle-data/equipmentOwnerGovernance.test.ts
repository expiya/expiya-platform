import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { approvalManifestChecksum, authorizationStatementHash, validateEquipmentApprovalManifest, validateEquipmentOwnerRegistry, type EquipmentApprovalManifest, type EquipmentOwnerActorRecord } from "./equipmentOwnerGovernance";
const ROOT = process.cwd();
const PACKAGE = "data/production/equipment-evidence/working/EE-PILOT-002/EE-PILOT-002-BATCH-001/owner-governance/EE-OWNER-APPROVAL-MANIFEST-001";
const read = <T>(file: string): T => JSON.parse(readFileSync(path.join(ROOT, file), "utf8")) as T;
const registry = read<{ actors: EquipmentOwnerActorRecord[] }>("data/production/equipment-evidence/governance/actor-registry.json");
const manifest = read<EquipmentApprovalManifest>(`${PACKAGE}/approval-manifest.json`);
const statement = readFileSync(path.join(ROOT, "data/production/equipment-evidence/governance/attestations/EQUIPMENT_OWNER_001-v1.txt"), "utf8");
const terminal = new Set(manifest.subjects.map((x) => `${x.subjectType}:${x.subjectId}`));

describe("Equipment Owner Governance Registration and Approval Manifest", () => {
  it("registers a scoped, distinct owner actor bound to the lossless statement", () => {
    expect(registry.actors).toHaveLength(1); expect(registry.actors[0]).toMatchObject({ actorId: "EQUIPMENT_OWNER_001", role: "EQUIPMENT_OWNER_APPROVER", scope: "EQUIPMENT_EVIDENCE_ONLY", status: "ACTIVE", revocationPolicy: "APPEND_ONLY_EVENT_REQUIRED" });
    expect(registry.actors[0]!.authorizationStatementHash).toBe(authorizationStatementHash(statement));
    expect(validateEquipmentOwnerRegistry({ actors: registry.actors, authorizationStatements: new Map([["EQUIPMENT_OWNER_001", statement]]), collectorActorIds: new Set(["ACTOR-COLLECTOR-CODEX-CATALOG-001"]), reviewerActorIds: new Set(["ACTOR-REVIEWER-CODEX-EQUIPMENT-001"]) })).toEqual([]);
    expect(validateEquipmentOwnerRegistry({ actors: [{ ...registry.actors[0]!, actorId: "ACTOR-COLLECTOR-CODEX-CATALOG-001" }], authorizationStatements: new Map([["ACTOR-COLLECTOR-CODEX-CATALOG-001", statement]]), collectorActorIds: new Set(["ACTOR-COLLECTOR-CODEX-CATALOG-001"]), reviewerActorIds: new Set() })).toContain("OWNER_ACTOR_ROLE_SEPARATION_VIOLATION");
    expect(validateEquipmentOwnerRegistry({ actors: [registry.actors[0]!, registry.actors[0]!], authorizationStatements: new Map([["EQUIPMENT_OWNER_001", statement]]), collectorActorIds: new Set(), reviewerActorIds: new Set() })).toContain("OWNER_ACTOR_ID_DUPLICATE");
    expect(authorizationStatementHash(`${statement}değişiklik`)).not.toBe(registry.actors[0]!.authorizationStatementHash);
  });

  it("binds exactly 47 assertions and two links with deterministic fingerprints", () => {
    expect(manifest).toMatchObject({ subjectCount: 49, assertionCount: 47, trimLinkCount: 2, catalogRelease: "v0.55.2", catalogFingerprint: "sha256:fd5609adcc0ca3fec0f8c9dc4dd1c903ed5514326bd322eacd4decff5a044f0f", ownerActorId: "EQUIPMENT_OWNER_001", decisionAuthority: "SHADOW_AND_EXPLANATION_DISABLED" });
    expect(manifest.subjects.filter((x) => x.subjectType === "ASSERTION" && x.exactVariantId === "5a64b246-3b05-52b6-9f24-b8f52ccc2305")).toHaveLength(23);
    expect(manifest.subjects.filter((x) => x.subjectType === "ASSERTION" && x.exactVariantId === "1a3cc01d-3bfa-56f3-817f-4cc77e723ef8")).toHaveLength(24);
    expect(new Set(manifest.subjects.map((x) => `${x.subjectType}:${x.subjectId}`)).size).toBe(49);
    expect(manifest.subjects.every((x) => x.secondReviewDisposition === "SECOND_REVIEW_PASSED" && x.terminalSupersessionState === "TERMINAL_NOT_SUPERSEDED" && x.sourceIds.length > 0 && x.contentFingerprint.startsWith("sha256:") && x.evidenceProvenanceFingerprint.startsWith("sha256:"))).toBe(true);
    const { manifestChecksum, ...payload } = manifest; expect(approvalManifestChecksum(payload)).toBe(manifestChecksum); expect(approvalManifestChecksum(payload)).toBe(approvalManifestChecksum(payload));
    const changed = { ...payload, subjects: payload.subjects.map((x, index) => index === 0 ? { ...x, subjectId: `${x.subjectId}-CHANGED` } : x) }; expect(approvalManifestChecksum(changed)).not.toBe(manifestChecksum);
  });

  it("fails closed for missing owner, conflict, supersession, duplicate, count, and catalog drift", () => {
    const args = { manifest, ownerActors: registry.actors, expectedCatalogFingerprint: manifest.catalogFingerprint, terminalPassedSubjectIds: terminal, supersededSubjectIds: new Set<string>(), conflictingSubjectIds: new Set<string>() };
    expect(validateEquipmentApprovalManifest(args)).toEqual([]);
    expect(validateEquipmentApprovalManifest({ ...args, ownerActors: [] })).toContain("OWNER_REGISTRY_BINDING_REQUIRED");
    const first = `${manifest.subjects[0]!.subjectType}:${manifest.subjects[0]!.subjectId}`;
    expect(validateEquipmentApprovalManifest({ ...args, supersededSubjectIds: new Set([first]) })).toContain("MANIFEST_SUPERSEDED_SUBJECT_FORBIDDEN");
    expect(validateEquipmentApprovalManifest({ ...args, conflictingSubjectIds: new Set([first]) })).toContain("MANIFEST_CONFLICT_SUBJECT_FORBIDDEN");
    const duplicate = { ...manifest, subjects: [...manifest.subjects.slice(0, -1), manifest.subjects[0]!] };
    expect(validateEquipmentApprovalManifest({ ...args, manifest: duplicate })).toEqual(expect.arrayContaining(["MANIFEST_DUPLICATE_SUBJECT", "MANIFEST_CHECKSUM_MISMATCH"]));
    expect(validateEquipmentApprovalManifest({ ...args, manifest: { ...manifest, subjectCount: 48 } })).toEqual(expect.arrayContaining(["MANIFEST_SUBJECT_COUNTS_INVALID", "MANIFEST_CHECKSUM_MISMATCH"]));
    expect(validateEquipmentApprovalManifest({ ...args, manifest: { ...manifest, catalogFingerprint: `sha256:${"0".repeat(64)}` } })).toEqual(expect.arrayContaining(["MANIFEST_CATALOG_MISMATCH", "MANIFEST_CHECKSUM_MISMATCH"]));
  });

  it("creates no approval, materialization, release, pointer, or decision authority", () => {
    const status = read<Record<string, unknown>>(`${PACKAGE}/package-status.json`);
    expect(status).toEqual({ activePointerChanged: false, approvalEventCount: 0, decisionAuthority: "SHADOW_AND_EXPLANATION_DISABLED", productionReleaseCreated: false, status: "AWAITING_EXPLICIT_OWNER_APPROVAL", verificationMaterializationCount: 0 });
    const audit = read<{ historicalConflictAssertionsExcluded: number; historicalConflictTrimLinksExcluded: number; inconclusiveResearchRowsExcluded: number; recordsDeletedOrModified: number }>(`${PACKAGE}/historical-audit-summary.json`);
    expect(audit).toMatchObject({ historicalConflictAssertionsExcluded: 48, historicalConflictTrimLinksExcluded: 2, inconclusiveResearchRowsExcluded: 55, recordsDeletedOrModified: 0 });
  });
});
