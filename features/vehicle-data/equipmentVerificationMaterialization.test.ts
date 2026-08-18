import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { EquipmentEvidenceAssertion, EquipmentOwnerApprovalEvent, EquipmentReviewEvent } from "@/types/equipmentEvidence";
import { assertUniqueActiveMaterializations, fingerprint, materializeAssertion, validateOwnerApproval } from "./equipmentVerificationMaterialization";

const root = process.cwd();
const output = path.join(root, "outputs/equipment-evidence-pilot-promotion-ee-pilot-002-batch-001");
const json = <T>(name: string) => JSON.parse(readFileSync(path.join(output, name), "utf8")) as T;

describe("Equipment pilot verification materialization gate", () => {
  const candidates = json<{ assertions: Array<{ assertionId: string; exactVariantId: string; featureCode: string }>; trimLinks: unknown[] }>("terminal-reviewed-candidates.json");
  const historical = json<{ historicalConflictAssertionCount: number; historicalConflictTrimLinkCount: number }>("historical-audit-integrity.json");
  const dryRun = json<Record<string, unknown>>("activation-dry-run.json");
  const coverage = json<{ catalogVariantCount: number; reviewedCandidateVariantCount: number; reviewedCandidateUncoveredVariantCount: number; authoritativeCoveredVariantCount: number; authoritativeUncoveredVariantCount: number; features: Array<{ unknownUncoveredCount: number; coverageRatio: number }> }>("coverage-report.json");

  it("selects exactly 47 reviewed terminal assertions in the 23 + 24 split", () => {
    expect(candidates.assertions).toHaveLength(47);
    const counts = Object.groupBy(candidates.assertions, (item) => item.exactVariantId);
    expect(Object.values(counts).map((items) => items?.length).sort()).toEqual([23, 24]);
  });

  it("selects two terminal trim links and preserves historical conflicts", () => {
    expect(candidates.trimLinks).toHaveLength(2);
    expect(historical).toMatchObject({ historicalConflictAssertionCount: 48, historicalConflictTrimLinkCount: 2 });
  });

  it("keeps the 566-record catalog compatible while authority remains empty", () => {
    expect(coverage).toMatchObject({ catalogVariantCount: 566, reviewedCandidateVariantCount: 2,
      reviewedCandidateUncoveredVariantCount: 564, authoritativeCoveredVariantCount: 0, authoritativeUncoveredVariantCount: 566 });
    expect(coverage.features.every((item) => item.unknownUncoveredCount === 566 && item.coverageRatio === 0)).toBe(true);
  });

  it("does not activate release, filters, ranking, questions, or public claims", () => {
    expect(dryRun).toMatchObject({ status: "BLOCKED_OWNER_APPROVAL_REQUIRED", releaseCreated: false, activePointerChanged: false,
      publicFilteringEnabled: false, publicRankingEnabled: false, automaticQuestionGenerationEnabled: false,
      publicEquipmentClaimsEnabled: false, decisionAuthority: "SHADOW_AND_EXPLANATION_DISABLED" });
  });

  it("requires a registered owner distinct from collector and reviewer", () => {
    const subject = { assertionId: "EE-AST-X" } as EquipmentEvidenceAssertion;
    const review = { reviewEventId: "EE-REV-X", toState: "SECOND_REVIEW_PASSED" } as EquipmentReviewEvent;
    const approval = { approvalEventId: "EE-APP-X", subjectId: "EE-AST-X", passedSecondReviewEventId: "EE-REV-X",
      actorRole: "EQUIPMENT_OWNER_APPROVER", actorInstanceId: "ACTOR-COLLECTOR-CODEX-CATALOG-001", inputFingerprint: fingerprint(subject) } as EquipmentOwnerApprovalEvent;
    expect(validateOwnerApproval({ approval, subject, passedReview: review, verifiedOwnerActorIds: new Set(),
      forbiddenActorIds: new Set([approval.actorInstanceId]) })).toEqual(expect.arrayContaining([
      "OWNER_GOVERNANCE_ACTOR_UNAVAILABLE", "OWNER_ACTOR_ROLE_SEPARATION_VIOLATION",
    ]));
  });

  it("rejects approval that changes or mismatches the reviewed input", () => {
    const subject = { assertionId: "EE-AST-X" } as EquipmentEvidenceAssertion;
    const review = { reviewEventId: "EE-REV-X", toState: "SECOND_REVIEW_PASSED" } as EquipmentReviewEvent;
    const approval = { approvalEventId: "EE-APP-X", subjectId: "EE-AST-X", passedSecondReviewEventId: "EE-REV-X",
      actorRole: "EQUIPMENT_OWNER_APPROVER", actorInstanceId: "ACTOR-OWNER-001", inputFingerprint: fingerprint({ changed: true }) } as EquipmentOwnerApprovalEvent;
    expect(validateOwnerApproval({ approval, subject, passedReview: review, verifiedOwnerActorIds: new Set([approval.actorInstanceId]),
      forbiddenActorIds: new Set() })).toContain("OWNER_APPROVAL_INPUT_FINGERPRINT_MISMATCH");
  });

  it("fails closed before materialization without owner approval", () => {
    const assertion = { assertionId: "EE-AST-X", exactVariantId: "variant-x", featureCode: "REAR_VIEW_CAMERA",
      sourceApplicability: "EXACT_VARIANT", conflictState: "CLEAR", availabilityStatus: "STANDARD", market: "TR",
      modelYearFrom: 2026, modelYearTo: 2026 } as EquipmentEvidenceAssertion;
    const result = materializeAssertion({ assertion, chain: [assertion.assertionId], passedReview: { reviewEventId: "EE-REV-X", toState: "SECOND_REVIEW_PASSED" } as EquipmentReviewEvent,
      approval: undefined, verifiedOwnerActorIds: new Set(), forbiddenActorIds: new Set(), catalogVariantIds: new Set(["variant-x"]),
      catalogFingerprint: "sha256:fd5609adcc0ca3fec0f8c9dc4dd1c903ed5514326bd322eacd4decff5a044f0f", materializedAt: "2026-08-18T20:45:00.000Z" });
    expect(result.materialization).toBeUndefined();
    expect(result.issues).toContain("OWNER_APPROVAL_REQUIRED");
  });

  it("rejects duplicate active materialization for one source assertion", () => {
    const item = { sourceAssertionId: "EE-AST-X" } as never;
    expect(assertUniqueActiveMaterializations([item, item])).toContain("DUPLICATE_ACTIVE_MATERIALIZATION");
  });

  it("contains no materializations or owner approvals in the blocked package", () => {
    expect(json<unknown[]>("owner-approval-events.json")).toEqual([]);
    expect(json<unknown[]>("verification-materializations.json")).toEqual([]);
    expect(json<unknown[]>("verified-trim-link-materializations.json")).toEqual([]);
  });
});
