import { describe,expect,it } from "vitest";
import { generateWave02Exact15OwnerReview } from "./generate";

describe("Wave-02 exact 15 owner review",()=>{
 it("is deterministic, eligible and candidate-only",async()=>{const first=await generateWave02Exact15OwnerReview(),second=await generateWave02Exact15OwnerReview();expect(first).toEqual(second);expect(first.totals.proposedAdditions).toBe(15);expect(first.totals.excluded).toBe(43);expect(first.approvalEligibility).toBe(true);expect(first.activationBoundary).toMatchObject({activePointerWrite:false,runtimeMutation:false,databaseMutation:false,productionMutation:false,deployment:false,push:false});});
 it("preserves baselines and proves exact membership effects",async()=>{const result=await generateWave02Exact15OwnerReview();expect(result.categories.every(row=>row.proposalAfter===row.baselineActive+row.proposedAdditions)).toBe(true);expect(result.categories.every(row=>row.eligible)).toBe(true);});
});
