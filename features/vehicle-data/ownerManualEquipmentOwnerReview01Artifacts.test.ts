import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const manualBase = "data/research/owner-manual-evidence-v4/releases/v4.3.0-equipment-owner-review-01";
const equipmentBase = "data/production/equipment-evidence/releases/v1.6.0-owner-reviewed-manual-bridges-catalog-v0.55.4-2026-09-04";
const governanceBase = "data/production/equipment-evidence/governance/approval-manifests/EE-OAM-OWNER-MANUAL-BRIDGE-01";
const read = <T>(file: string): T => JSON.parse(readFileSync(file, "utf8")) as T;
const digest = (file: string): string => `sha256:${createHash("sha256").update(readFileSync(file)).digest("hex")}`;

describe("equipment proposal owner review 01 artifacts", () => {
  it("records one scoped owner disposition for every proposal", () => {
    const events = read<Array<{ eventId: string; proposalId: string; exactVariantId: string; featureCode: string; action: string; actorId: string; actorRole: string; approvalManifestChecksum: string; reasonCodes: string[]; decisionAuthority: string }>>(`${governanceBase}/owner-decision-events.json`);
    expect(events).toHaveLength(14);
    expect(new Set(events.map((item) => item.proposalId)).size).toBe(14);
    expect(new Set(events.map((item) => item.eventId)).size).toBe(14);
    expect(events.every((item) => item.action === "APPROVED" && item.actorId === "EQUIPMENT_OWNER_001" && item.actorRole === "EQUIPMENT_OWNER_APPROVER" && /^sha256:[a-f0-9]{64}$/u.test(item.approvalManifestChecksum) && item.reasonCodes.length > 0 && item.decisionAuthority === "SHADOW_AND_EXPLANATION_DISABLED")).toBe(true);
  });

  it("materializes only approved associations and promotes only model-year-safe manuals", () => {
    const equipment = read<{ verifiedAssertions: Array<{ sourceAssertionId: string; exactVariantId: string; ownerApprovalEventId: string }>; coverage: { verifiedAssertionCoverage: { exactVariantCount: number }; coveredUniqueExactVariantCount: number } }>(`${equipmentBase}/equipment-evidence.json`);
    const report = read<{ ownerDecisionCounts: Record<string, number>; equipmentCoverage: Record<string, number>; manualCoverage: Record<string, number>; readiness: Record<string, number | string>; decisionNeutrality: Record<string, boolean | string> }>(`${manualBase}/coverage-report.json`);
    expect(equipment.verifiedAssertions.filter((item) => item.sourceAssertionId.startsWith("OM-EQ-PROP-"))).toHaveLength(14);
    expect(equipment.coverage).toMatchObject({ verifiedAssertionCoverage: { exactVariantCount: 8 }, coveredUniqueExactVariantCount: 10 });
    expect(report).toMatchObject({ ownerDecisionCounts: { total: 14, approved: 14, rejected: 0, deferred: 0 }, equipmentCoverage: { verifiedAssertionsBefore: 112, verifiedAssertionsAfter: 126, verifiedExactVariantsBefore: 4, verifiedExactVariantsAfter: 8 }, manualCoverage: { exactTrAssertionsBefore: 5, exactTrAssertionsAfter: 15, exactTrVariantsBefore: 1, exactTrVariantsAfter: 4, promotedThisWorkUnit: 10 }, readiness: { advisorReadyVariantsBefore: 0, advisorReadyVariantsAfter: 0, comparisonReadyVariantsBefore: 0, comparisonReadyVariantsAfter: 0 }, decisionNeutrality: { activeEquipmentPointerChanged: false, runtimeChanged: false, ySelectionChanged: false, yAuthorizationChanged: false } });
    const bridge = read<{ variants: Array<{ exactVariantId: string; decisions: Array<{ decision: string; featureCode: string }> }> }>(`${manualBase}/exact-tr-bridge-decisions.json`);
    const exact = bridge.variants.flatMap((item) => item.decisions.map((decision) => ({ ...decision, exactVariantId: item.exactVariantId }))).filter((item) => item.decision === "EXACT_VARIANT_VERIFIED");
    expect(exact).toHaveLength(15);
    expect(new Set(exact.map((item) => item.exactVariantId)).size).toBe(4);
    expect(exact.filter((item) => item.exactVariantId === "cf63bfb6-d503-5669-9799-6593f4b3f96b")).toHaveLength(0);
    const activePointer = read<{ activeEquipmentEvidenceRelease: string }>("data/production/equipment-evidence/active.json");
    const neutrality = read<{ activePointerSha256: string; activationPerformed: boolean; ySelectionImpact: string; yAuthorizationImpact: string }>(`${equipmentBase}/decision-neutrality.json`);
    expect(activePointer.activeEquipmentEvidenceRelease).toBe("v1.5.5-catalog-v0.55.4-2026-08-20");
    expect(neutrality).toMatchObject({ activePointerSha256: digest("data/production/equipment-evidence/active.json"), activationPerformed: false, ySelectionImpact: "ZERO", yAuthorizationImpact: "ZERO" });
  });

  it("binds files by digest, preserves parents and replays idempotently", () => {
    const manualManifest = read<{ files: Array<{ path: string; sha256: string }>; parentRelease: string }>(`${manualBase}/manifest.json`);
    const equipmentManifest = read<{ files: Array<{ path: string; sha256: string }>; parentRelease: string }>(`${equipmentBase}/manifest.json`);
    const governanceChecksums = read<Record<string, string>>(`${governanceBase}/checksums.json`);
    expect(manualManifest.files.every((item) => digest(`${manualBase}/${item.path}`) === item.sha256)).toBe(true);
    expect(equipmentManifest.files.every((item) => digest(`${equipmentBase}/${item.path}`) === item.sha256)).toBe(true);
    expect(Object.entries(governanceChecksums).every(([file, hash]) => digest(`${governanceBase}/${file}`) === hash)).toBe(true);
    expect(manualManifest.parentRelease).toBe("v4.2.0-equipment-evidence-batch-01");
    expect(equipmentManifest.parentRelease).toBe("v1.5.5-catalog-v0.55.4-2026-08-20");
    const files = [`${manualBase}/exact-tr-bridge-decisions.json`, `${manualBase}/coverage-report.json`, `${manualBase}/manifest.json`, `${equipmentBase}/equipment-evidence.json`, `${equipmentBase}/manifest.json`, `${governanceBase}/owner-decision-events.json`];
    const before = files.map(digest);
    execFileSync(process.execPath, ["--import", "tsx", "scripts/materialize-owner-reviewed-manual-equipment-01.ts"], { cwd: process.cwd() });
    expect(files.map(digest)).toEqual(before);
  });
});
