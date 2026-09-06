import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const base = "data/research/owner-manual-evidence-v4/releases/v4.2.0-equipment-evidence-batch-01";
const read = <T>(name: string): T => JSON.parse(readFileSync(`${base}/${name}`, "utf8")) as T;
const digest = (name: string): string => `sha256:${createHash("sha256").update(readFileSync(`${base}/${name}`)).digest("hex")}`;

describe("owner-manual equipment evidence batch 01 artifacts", () => {
  it("completes all seven bounded attempts without unsafe inference", () => {
    const attempts = read<{ requestedTargetCount: number; completedAttemptCount: number; attempts: Array<{ targetId: string; attemptComplete: boolean; status: string; artifactSha256: string; reasonCodes: string[] }> }>("source-attempts.json");
    expect(attempts).toMatchObject({ requestedTargetCount: 7, completedAttemptCount: 7 });
    expect(new Set(attempts.attempts.map((item) => item.targetId)).size).toBe(7);
    expect(attempts.attempts.every((item) => item.attemptComplete && /^sha256:[a-f0-9]{64}$/u.test(item.artifactSha256))).toBe(true);
    expect(attempts.attempts.find((item) => item.targetId === "17059c89-031e-542a-90dd-83be8c972960")?.reasonCodes).toContain("SIBLING_TRIM_INFERENCE_FORBIDDEN");
    expect(attempts.attempts.find((item) => item.targetId === "cf63bfb6-d503-5669-9799-6593f4b3f96b")?.reasonCodes).toContain("OWNER_MANUAL_ARTIFACT_MY2024_FAIL_CLOSED");
  });

  it("keeps 14 reviewed associations owner-pending and emits no unapproved promotion", () => {
    const payload = read<{ ownerApproval: null; proposals: Array<{ proposalId: string; exactVariantId: string; source: { artifactSha256: string; locator: { pageNumber: number; row: string; column: string } }; independentReview: { status: string; reviewerActorId: string }; ownerApproval: null; materializationStatus: string }> }>("exact-equipment-association-proposals.json");
    const report = read<{ verdict: string; counts: Record<string, number>; decisionNeutrality: Record<string, boolean | number> }>("coverage-report.json");
    expect(payload.ownerApproval).toBeNull();
    expect(payload.proposals).toHaveLength(14);
    expect(payload.proposals.every((item) => item.independentReview.status === "PASSED" && item.ownerApproval === null && item.materializationStatus === "PROPOSAL_REVIEWED_OWNER_APPROVAL_PENDING" && /^sha256:[a-f0-9]{64}$/u.test(item.source.artifactSha256) && item.source.locator.pageNumber > 0 && Boolean(item.source.locator.row) && Boolean(item.source.locator.column))).toBe(true);
    expect(report).toMatchObject({ verdict: "IMPLEMENTED", counts: { completedSourceAttempts: 7, independentlyReviewedExactEquipmentAssociations: 14, ownerApprovedAssociations: 0, manualBridgeCandidatesAfterOwnerApproval: 10, exactManualPromotionsThisBatch: 0, exactManualAssertionsBefore: 5, exactManualAssertionsAfter: 5 }, decisionNeutrality: { ownerApprovalCreated: false, materializationCreated: false, l9PromotionsEmitted: 0, activePointerChanged: false, runtimeChanged: false } });
  });

  it("binds release-local files by checksum and regenerates byte-identically", () => {
    const manifest = read<{ files: Array<{ path: string; sha256: string }> }>("manifest.json");
    expect(manifest.files.every((item) => digest(item.path) === item.sha256)).toBe(true);
    const generated = ["source-attempts.json", "exact-equipment-association-proposals.json", "independent-review-events.json", "owner-review-package.json", "exact-tr-bridge-decisions.json", "target-dispositions.json", "coverage-report.json", "manifest.json"];
    const before = generated.map(digest);
    execFileSync(process.execPath, ["--import", "tsx", "scripts/generate-owner-manual-equipment-evidence-batch-01.ts"], { cwd: process.cwd() });
    expect(generated.map(digest)).toEqual(before);
  });
});
