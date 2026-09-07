import { describe, expect, it } from "vitest";
import { generateWave02Exact14IdentitySupersession } from "./generate";

describe("Wave-02 exact-15 identity supersession", () => {
  it("terminally reconciles the semantic duplicate to the existing canonical identity", async () => {
    const result = await generateWave02Exact14IdentitySupersession();
    expect(result.duplicateTerminal).toMatchObject({ observationExactProductId: "appliances:refrigerator:lg:lg-gc-b569nllm", canonicalExistingExactProductId: "LG_GC_B569NLLM_TR", outcome: "REJECTED_DUPLICATE_EXISTING_EXACT_IDENTITY", terminal: true, membershipEffect: 0 });
    expect(result.duplicateTerminal.comparison.normalizedIdentityKey).toMatchObject({ matches: true, existing: "lggcb569nllm", observed: "lggcb569nllm" });
  });

  it("proposes exactly 14 additions and 94 memberships without a silent drop", async () => {
    const first = await generateWave02Exact14IdentitySupersession(), second = await generateWave02Exact14IdentitySupersession();
    expect(first).toEqual(second);
    expect(first.totals).toEqual({ baselineActive: 80, proposedAdditions: 14, proposedAfter: 94, preservedExclusions: 43, duplicateTerminals: 1 });
    expect(Object.values(first.proofs).every(Boolean)).toBe(true);
    expect(first.categories.find(item => item.categoryId === "REFRIGERATOR")?.proposedMembership).toMatchObject({ before: 8, effect: 1, after: 9 });
    expect(first.productBindings).toHaveLength(14);
  });

  it("keeps old authority ineffective for the new scope until a separate CAS approval", async () => {
    const result = await generateWave02Exact14IdentitySupersession();
    expect(result.supersedes.oldApprovalDoesNotCoverThisScope).toBe(true);
    expect(result.supersessionEvent).toMatchObject({ effective: false, ownerApprovalRequired: true, appendOnly: true, oldArtifactsRewritten: false });
    expect(result.activationPlan).toMatchObject({ status: "PLANNED_NOT_AUTHORIZED", executed: false, proposed: { additions: 14, active: 94, oldExact15RuntimeAuthority: "PROHIBITED_AFTER_SUCCESSFUL_CAS" }, databaseMigration: "NONE", deployment: false, push: false });
    expect(Object.values(result.mutationBoundary).every(value => value === false)).toBe(true);
  });
});
