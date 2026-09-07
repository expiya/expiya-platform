import { describe, expect, it } from "vitest";
import { generateWave02Exact15ActivationPreflight } from "./generate";

describe("Wave-02 exact-15 activation preflight", () => {
  it("passes against re-read active authority without activating", async () => {
    const { preflight } = await generateWave02Exact15ActivationPreflight();
    expect(preflight.status).toBe("PASS_NOT_ACTIVATED");
    expect(preflight.totals).toEqual({ before: 80, additions: 15, after: 95 });
    expect(Object.values(preflight.gates).every(Boolean)).toBe(true);
    expect(Object.values(preflight.activationBoundary).every(value => value === false)).toBe(true);
  });

  it("binds exact membership, evidence and byte-identical rollback", async () => {
    const first = await generateWave02Exact15ActivationPreflight();
    const second = await generateWave02Exact15ActivationPreflight();
    expect(first).toEqual(second);
    expect(first.preflight.categories.every(row => row.proof.additionsAbsentFromActive && row.proof.proposalMatchesOwnerReview && Object.values(row.completeness).every(Boolean))).toBe(true);
    expect(first.rollback.proof).toMatchObject({ allBytesCaptured: true, allDigestsReproduce: true, failureBeforeCasLeavesPointersUnchanged: true, failureDuringCasAbortsAtomicWrite: true });
    expect(first.proposedPointer.state).toBe("PROPOSED_NOT_ACTIVE");
  });
});
