import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const evidenceRoot = path.join(process.cwd(), "data/production/personas/evidence");
const requestRaw = readFileSync(path.join(evidenceRoot, "owner-approval/requests/persona-v3.9-2026-08-24-01/owner-approval-request.json"), "utf8");
const event = JSON.parse(readFileSync(path.join(evidenceRoot, "owner-approval/events/PERSONA-V39-OWNER-APPROVAL-2026-08-24-01/owner-approval-event.json"), "utf8"));
const releaseRoot = path.join(evidenceRoot, "owner-approved/release-candidates/v3.9.0-catalog-v0.55.4-2026-08-24-owner-approved-rc.1");
const candidateRaw = readFileSync(path.join(releaseRoot, "owner-approved-candidate.json"), "utf8");
type FinalClaim = { claimId: string; finalDecision: "APPROVE" | "REJECT" };
const candidate = JSON.parse(candidateRaw) as {
  approvedClaims: FinalClaim[];
  rejectedClaims: FinalClaim[];
  coverage: { familyCount: number; variantCount: number; reviewedClaimCount: number };
  approvalStatus: string;
  activationPerformed: boolean;
  rankingMutationAllowed: boolean;
  activePointerMutationAllowed: boolean;
  scorePolicy: { personaScoreCap: number };
};
const manifest = JSON.parse(readFileSync(path.join(releaseRoot, "manifest.json"), "utf8"));

describe("persona V3.9 owner approval event", () => {
  it("binds the exact owner statement to the immutable request", () => {
    expect(event.approvalStatement).toBe("595 onay ve 5 ret kararını onaylıyorum");
    expect(event.requestPayloadSha256).toBe(`sha256:${createHash("sha256").update(requestRaw).digest("hex")}`);
    expect(event.disposition).toEqual({ approveClaimCount: 595, rejectClaimCount: 5 });
    expect(event.actor.role).toBe("PRODUCT_OWNER");
    expect(event.appendOnly).toBe(true);
  });

  it("materializes all and only the approved and rejected decisions", () => {
    expect(candidate.approvedClaims).toHaveLength(595);
    expect(candidate.rejectedClaims).toHaveLength(5);
    expect(candidate.coverage).toMatchObject({ familyCount: 385, variantCount: 549, reviewedClaimCount: 600 });
    expect(new Set([...candidate.approvedClaims, ...candidate.rejectedClaims].map((claim) => claim.claimId)).size).toBe(600);
    expect(candidate.approvedClaims.every((claim) => claim.finalDecision === "APPROVE")).toBe(true);
    expect(candidate.rejectedClaims.every((claim) => claim.finalDecision === "REJECT")).toBe(true);
  });

  it("keeps approval separate from activation and ranking mutation", () => {
    expect(candidate.approvalStatus).toBe("OWNER_APPROVED_NOT_ACTIVE");
    expect(candidate.activationPerformed).toBe(false);
    expect(candidate.rankingMutationAllowed).toBe(false);
    expect(candidate.activePointerMutationAllowed).toBe(false);
    expect(event.runtimeActivationAuthorized).toBe(false);
    expect(event.activePointerMutationAuthorized).toBe(false);
    expect(candidate.scorePolicy.personaScoreCap).toBe(0.75);
  });

  it("checksum-binds the owner-approved release candidate", () => {
    expect(manifest.payloadSha256).toBe(`sha256:${createHash("sha256").update(candidateRaw).digest("hex")}`);
    expect(manifest).toMatchObject({ approvedClaimCount: 595, rejectedClaimCount: 5, activationPerformed: false, activePointerChanged: false });
  });
});
