import { describe, expect, it } from "vitest";
import { recordWave03OwnerApproval } from "./recordApproval";

describe("Wave-03 owner approval", () => {
  it("normalizes escaped category identifiers and records idempotently", async () => { const first = await recordWave03OwnerApproval(), second = await recordWave03OwnerApproval(); expect(first).toEqual(second); expect(first.transportNormalization).toMatchObject({ applied: true, normalizedSentenceDigest: first.canonicalApprovalSentenceDigest }); expect(first.approvedScope.categories).toEqual(["COMPUTER_AUDIO", "GAME_CONSOLE", "HOME_SECURITY_CAMERA"]); });
  it("keeps P/Y and every mutation unauthorized", async () => { const event = await recordWave03OwnerApproval(); expect(event.approvedScope).toMatchObject({ activeMembership: 94, inactiveNextBatchProposal: 102, exactCandidates: 3, informationReady: true, pReady: false, yReady: false }); expect(Object.values(event.boundary).every(value => value === false)).toBe(true); });
});
