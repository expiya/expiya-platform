import { describe, expect, it } from "vitest";
import { recordWave02Exact14SupersessionApproval } from "./recordApproval";

describe("Wave-02 exact-14 supersession approval", () => {
  it("normalizes only Markdown-escaped underscores and binds the canonical package sentence", async () => {
    const first = await recordWave02Exact14SupersessionApproval(), second = await recordWave02Exact14SupersessionApproval();
    expect(first).toEqual(second);
    expect(first.transportNormalization).toMatchObject({ applied: true, rule: "MARKDOWN_ESCAPED_UNDERSCORE_TO_LITERAL_UNDERSCORE", semanticTokenBefore: "LG\\_GC\\_B569NLLM\\_TR", canonicalTokenAfter: "LG_GC_B569NLLM_TR" });
    expect(first.canonicalApprovalSentence).toContain("LG_GC_B569NLLM_TR");
    expect(first.canonicalApprovalSentence).not.toContain("\\_");
  });

  it("records approval without making supersession effective", async () => {
    const event = await recordWave02Exact14SupersessionApproval();
    expect(event.approvedScope).toMatchObject({ baselineActive: 80, semanticExactAdditions: 14, proposedMembership: 94, duplicateMembershipEffect: 0 });
    expect(event.priorAuthority).toMatchObject({ exact15ApprovalCoversNewScope: false, exact15OverlayStillSelectedLocally: true, supersessionEffective: false });
    expect(Object.values(event.authorizationBoundary)).toEqual([true, false, false, false, false, false, false, false]);
  });
});
