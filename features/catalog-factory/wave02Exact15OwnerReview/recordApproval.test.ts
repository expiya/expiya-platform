import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { recordWave02Exact15OwnerApproval } from "./recordApproval";

describe("Wave-02 exact 15 owner approval", () => {
  it("records the exact digest-bound approval without activating", async () => {
    const first = await recordWave02Exact15OwnerApproval();
    const second = await recordWave02Exact15OwnerApproval();
    expect(first).toEqual(second);
    expect(first.candidateDigest).toBe("d874eda28ba560b03a1ee3af53168717bc815f9f46e73753c2e0ffbeb9673669");
    expect(first.approvedScope).toEqual({ exactProductAdditions: 15, existingActiveMembership: "PRESERVE_EXACTLY" });
    expect(Object.values(first.authorizationBoundary)).toEqual([true, false, false, false, false, false, false, false]);
  });

  it("persists the verbatim approval sentence", async () => {
    const event = await recordWave02Exact15OwnerApproval();
    const persisted = await readFile(`outputs/catalog-factory-wave-02-15-exact-owner-review-01/governance/approval-events/${event.eventId}/owner-approval-sentence.txt`, "utf8");
    expect(persisted).toBe(`${event.ownerApprovalSentence}\n`);
  });
});
