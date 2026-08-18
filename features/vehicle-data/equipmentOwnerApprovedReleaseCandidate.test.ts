import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { approvalManifestChecksum, authorizationStatementHash, validateOwnerApprovalGrantEvents, type EquipmentApprovalManifest, type EquipmentOwnerActorRecord, type EquipmentOwnerApprovalGrantEvent } from "./equipmentOwnerGovernance";
import { assertUniqueActiveMaterializations, assertUniqueOwnerApprovalEvents, fingerprint } from "./equipmentVerificationMaterialization";

const ROOT = process.cwd(), RELEASE_ID = "v1.3.0-pilot-verified-catalog-v0.55.2-2026-08-18";
const DIR = `data/production/equipment-evidence/release-candidates/${RELEASE_ID}`;
const read = <T>(file: string): T => JSON.parse(readFileSync(path.join(ROOT, file), "utf8")) as T;
const manifest = read<EquipmentApprovalManifest>("data/production/equipment-evidence/working/EE-PILOT-002/EE-PILOT-002-BATCH-001/owner-governance/EE-OWNER-APPROVAL-MANIFEST-001/approval-manifest.json");
const actor = read<{ actors: EquipmentOwnerActorRecord[] }>("data/production/equipment-evidence/governance/actor-registry.json").actors[0]!;
const events = read<EquipmentOwnerApprovalGrantEvent[]>(`${DIR}/owner-approval-events.json`);
const assertions = read<Array<Record<string, unknown> & { sourceAssertionId: string; exactVariantId: string; featureCode: string; availabilityStatus: string; standardOrOptional: string; terminalSupersessionChain: string[]; decisionAuthority: string }>>(`${DIR}/verified-assertion-materializations.json`);
const trimLinks = read<Array<Record<string, unknown> & { sourceTrimLinkId: string; exactVariantId: string; terminalSupersessionChain: string[] }>>(`${DIR}/verified-trim-link-materializations.json`);
const release = read<Record<string, unknown> & { featureDefinitions: unknown[]; verifiedAssertions: unknown[]; verifiedTrimLinks: unknown[]; projections: Array<Record<string, unknown>>; coverage: Record<string, unknown>; decisionControls: Record<string, unknown> }>(`${DIR}/equipment-evidence-release-candidate.json`);

describe("bounded owner approval materialization and pilot release candidate", () => {
  it("validates owner authorization, approval statement, and exact manifest binding", () => {
    const authorization = readFileSync(path.join(ROOT, "data/production/equipment-evidence/governance/attestations/EQUIPMENT_OWNER_001-v1.txt"), "utf8");
    const attestation = read<Record<string, string | number>>(`${DIR}/approval-attestation.json`), statement = readFileSync(path.join(ROOT, DIR, "approval-statement.txt"), "utf8");
    expect(actor).toMatchObject({ actorId: "EQUIPMENT_OWNER_001", status: "ACTIVE", scope: "EQUIPMENT_EVIDENCE_ONLY", revocationPolicy: "APPEND_ONLY_EVENT_REQUIRED" });
    expect(actor.actorId).not.toMatch(/ACTOR-COLLECTOR|ACTOR-REVIEWER/u); expect(actor.authorizationStatementHash).toBe(authorizationStatementHash(authorization));
    expect(attestation.approvalStatementChecksum).toBe(authorizationStatementHash(statement)); expect(attestation.approvalManifestChecksum).toBe(manifest.manifestChecksum);
    const { manifestChecksum, ...payload } = manifest; expect(approvalManifestChecksum(payload)).toBe(manifestChecksum);
  });

  it("creates exactly 49 unique, append-only manifest-scoped approval events", () => {
    expect(events).toHaveLength(49); expect(events.filter((x) => x.subjectType === "ASSERTION")).toHaveLength(47); expect(events.filter((x) => x.subjectType === "TRIM_LINK")).toHaveLength(2);
    expect(assertUniqueOwnerApprovalEvents(events)).toEqual([]); expect(validateOwnerApprovalGrantEvents({ events, manifest, ownerActor: actor })).toEqual([]);
    expect(assertUniqueOwnerApprovalEvents([...events, events[0]!])).toContain("DUPLICATE_OWNER_APPROVAL_EVENT");
    expect(validateOwnerApprovalGrantEvents({ events, manifest: { ...manifest, manifestChecksum: `sha256:${"0".repeat(64)}` }, ownerActor: actor })).toContain("OWNER_APPROVAL_MANIFEST_SCOPE_MISMATCH");
    expect(events.every((x) => x.decisionAuthority === "SHADOW_AND_EXPLANATION_DISABLED" && x.sourceContentFingerprint.startsWith("sha256:") && x.sourceSecondReviewEventId.startsWith("EE-REV-"))).toBe(true);
  });

  it("materializes 47 immutable assertions in the 23/24 split and rejects duplicates", () => {
    expect(assertions).toHaveLength(47); expect(assertions.filter((x) => x.exactVariantId === "5a64b246-3b05-52b6-9f24-b8f52ccc2305")).toHaveLength(23); expect(assertions.filter((x) => x.exactVariantId === "1a3cc01d-3bfa-56f3-817f-4cc77e723ef8")).toHaveLength(24);
    expect(assertions.every((x) => x.verificationState === "VERIFIED" && x.catalogRelease === "v0.55.2" && x.catalogFingerprint === "sha256:fd5609adcc0ca3fec0f8c9dc4dd1c903ed5514326bd322eacd4decff5a044f0f" && x.availabilityStatus !== "UNKNOWN" && x.availabilityStatus === x.standardOrOptional)).toBe(true);
    expect(assertUniqueActiveMaterializations(assertions as never)).toEqual([]); expect(assertUniqueActiveMaterializations([assertions[0], assertions[0]] as never)).toContain("DUPLICATE_ACTIVE_MATERIALIZATION");
  });

  it("materializes two terminal trim links without historical or cross-powertrain leakage", () => {
    expect(trimLinks).toHaveLength(2); expect(new Set(trimLinks.map((x) => x.exactVariantId)).size).toBe(2);
    expect(trimLinks.find((x) => x.exactVariantId.startsWith("1a3"))?.terminalSupersessionChain).toHaveLength(3); expect(trimLinks.find((x) => x.exactVariantId.startsWith("5a64"))?.terminalSupersessionChain).toHaveLength(1);
    const historical = read<Record<string, number>>(`${DIR}/historical-audit-integrity.json`); expect(historical).toMatchObject({ originalIbridaAssertionsPreservedExcluded: 24, r1IbridaAssertionsPreservedExcluded: 24, historicalConflictAssertionsPreservedExcluded: 48, historicalConflictTrimLinksPreservedExcluded: 2, inconclusiveResearchRowsPreservedExcluded: 55, materializedHistoricalRecordCount: 0 });
  });

  it("keeps projection exact, evidence-preserving, and free of negative or inferred availability", () => {
    expect(release.projections).toHaveLength(47); expect(release.projections.every((x) => x.projectionType === "EXACT_VARIANT_VERIFIED" && x.familyInheritance === false && x.crossPowertrainPropagation === false && x.evidenceReinterpretation === false && x.availabilityStatus !== "UNKNOWN" && x.availabilityStatus !== "NOT_AVAILABLE")).toBe(true);
    expect(new Set(release.projections.map((x) => x.exactVariantId))).toEqual(new Set(["1a3cc01d-3bfa-56f3-817f-4cc77e723ef8", "5a64b246-3b05-52b6-9f24-b8f52ccc2305"]));
  });

  it("builds a compatible 51-feature, 2-covered/564-uncovered pilot candidate", () => {
    expect(release).toMatchObject({ releaseCandidateId: RELEASE_ID, state: "PILOT_VERIFIED_DATA", compatibleCatalogRelease: "v0.55.2", compatibleCatalogFingerprint: "sha256:fd5609adcc0ca3fec0f8c9dc4dd1c903ed5514326bd322eacd4decff5a044f0f", decisionAuthority: "SHADOW_AND_EXPLANATION_DISABLED" });
    expect(release.featureDefinitions).toHaveLength(51); expect(release.verifiedAssertions).toHaveLength(47); expect(release.verifiedTrimLinks).toHaveLength(2);
    expect(release.coverage).toMatchObject({ catalogVariantCount: 566, coveredExactVariantCount: 2, uncoveredExactVariantCount: 564, uncoveredDisposition: "UNCOVERED_NOT_ASSERTED_UNKNOWN", syntheticUnknownAssertionCount: 0, authoritativeNegativeProjectionCount: 0, conflictProjectionCount: 0 });
  });

  it("keeps all decision controls disabled and is not imported by Decision V2", () => {
    expect(release.decisionControls).toEqual({ candidateElimination: "FORBIDDEN", candidateResurrection: "FORBIDDEN", hardFilter: false, hardFilterAfterConfirmation: false, offerOrderingImpact: "NONE", questionGeneration: false, softRanking: false, userFacingExplanation: false });
    const files = readdirSync(path.join(ROOT, "features/decision/v2"), { recursive: true }).filter((file): file is string => typeof file === "string" && file.endsWith(".ts"));
    expect(files.some((file) => readFileSync(path.join(ROOT, "features/decision/v2", file), "utf8").includes(RELEASE_ID))).toBe(false);
  });

  it("verifies canonical release checksum and detects payload drift", () => {
    const immutable = read<{ releaseChecksum: string }>(`${DIR}/immutable-release-manifest.json`); expect(immutable.releaseChecksum).toBe(fingerprint(release));
    expect(fingerprint({ ...release, state: "CHANGED" })).not.toBe(immutable.releaseChecksum);
  });

  it("preserves the pre-activation gate's pinned active hashes and fail-closed activation/rollback plan", () => {
    const readiness = read<Record<string, unknown>>("data/production/equipment-evidence/activation-readiness/v1.3.0-pilot-verified-catalog-v0.55.2-2026-08-18.json");
    expect(readiness).toMatchObject({ currentPointerChecksum: "sha256:3ae093539a70fdb064ba58802ca5d18765ac3aeec5c44a0bcdfd6d9ecbc0d3a6", generatedModuleCurrentChecksum: "sha256:3e55f29b08691fe516459a5c31c78b1c31dd7c0fc873648fea5657bfe079565e" });
    expect(read<Record<string, unknown>>(`${DIR}/activation-dry-run.json`)).toMatchObject({ status: "COMPATIBLE_DECISION_NEUTRAL_AWAITING_SEPARATE_ACTIVATION_APPROVAL", catalogCompatible: true, decisionNeutral: true, activePointerChanged: false, activationAuthorized: false });
    expect(read<Record<string, unknown>>(`${DIR}/rollback-plan.json`)).toMatchObject({ activationPerformed: false, currentActiveRelease: "v1.2.2-catalog-v0.55.2-2026-08-18", currentRollbackRequired: false, ifFutureActivationFails: { appendOnlyRevocationRequired: true, retainApprovalAndMaterializationAudit: true } });
  });
});
