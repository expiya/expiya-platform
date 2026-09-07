import { describe, expect, it } from "vitest";
import { recordNextBatch8Exact14OwnerApproval } from "./recordApproval";

describe("next-batch 8 exact-14 owner approval", () => {
  it("records the exact digest-bound scope idempotently", async () => { const first = await recordNextBatch8Exact14OwnerApproval(), second = await recordNextBatch8Exact14OwnerApproval(); expect(first).toEqual(second); expect(first.approvedScope).toEqual({ currentMembership: 94, exactAdditions: 8, proposedMembership: 102, conflictedExcluded: 8, unknownExcluded: 27, informationReady: true, pReady: false, yReady: false }); });
  it("grants no activation or external mutation authority", async () => { const event = await recordNextBatch8Exact14OwnerApproval(); expect(event.authorizationBoundary).toEqual({ atomicActivationSeparatelyRequired: true, pointerMutation: false, runtimeMutation: false, databaseMutation: false, productionMutation: false, deployment: false, push: false }); });
});
