import { describe, expect, it } from "vitest";
import { acquireWave03Evidence, materializeWave03Candidate } from "./acquireEvidence";

describe("Wave-03 distinct primary evidence", () => {
  it("binds three distinct primary TR snapshots deterministically", async () => { const first = await acquireWave03Evidence(), second = await acquireWave03Evidence(); expect(first).toEqual(second); expect(first.checkpoints).toHaveLength(3); expect(new Set(first.checkpoints.map(row => row.url)).size).toBe(3); expect(first.wave02UrlReuse).toBe(0); });
  it("keeps the inactive next-batch proposal separate and P/Y closed", async () => { const { result } = await materializeWave03Candidate(); expect(result.authority).toMatchObject({ activeExact14Membership: 94, inactiveApprovedNextBatch8Proposal: 102, nextBatch8CountedAsActive: false, oldExact15: "PROHIBITED" }); expect(result.readiness).toEqual({ INFORMATION_READY: true, P_READY: false, Y_READY: false }); expect(result.candidates.every(row => row.pMateriality.knownPartitions === 0 && row.lifecycle.endsWith("NOT_ACTIVE"))).toBe(true); expect(result.reconciliation.silentDrop).toBe(0); });
  it("permits no mutation or ranking side channel", async () => { const { result } = await materializeWave03Candidate(); expect(Object.values(result.boundaries).every(value => value === false)).toBe(true); expect(result.candidates.every(row => Object.values(row.ranking).every(value => value === false) && row.persona.rankingEffect === "NONE")).toBe(true); });
});
