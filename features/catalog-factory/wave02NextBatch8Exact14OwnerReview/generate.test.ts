import { describe, expect, it } from "vitest";
import { generateNextBatch8Exact14OwnerReview } from "./generate";

describe("next-batch 8 exact-14 owner review candidate", () => {
  it("is deterministic and proposes exactly 94+8=102", async () => { const first = await generateNextBatch8Exact14OwnerReview(), second = await generateNextBatch8Exact14OwnerReview(); expect(first).toEqual(second); expect(first.totals).toEqual({ before: 94, additions: 8, proposedAfter: 102, conflictedExcluded: 8, unknownExcluded: 27, observations: 43 }); expect(first.approvalEligibility).toBe(true); });
  it("keeps all excluded observations terminal and P/Y unauthorized", async () => { const result = await generateNextBatch8Exact14OwnerReview(); expect(result.exclusionLedger).toHaveLength(35); expect(result.proofs).toMatchObject({ zeroSilentDrop: true, semanticIdentityUnique: true, informationReady: true, pAndYNotAuthorized: true }); expect(result.categories.flatMap(row => row.products).every(row => row.decisionProjection.mode === "SHADOW_ONLY" && row.decisionProjection.activeQuestions === 0)).toBe(true); });
  it("performs no activation or external mutation", async () => { const result = await generateNextBatch8Exact14OwnerReview(); expect(result.activation).toMatchObject({ pointerMutation: false, runtimeMutation: false, databaseMutation: false, productionMutation: false, deployment: false, push: false }); });
});
