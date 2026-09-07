import { describe,expect,it } from "vitest";
import { materializeAlternativeEvidence } from "./materialize";

describe("Wave-02 alternative evidence",()=>{
 it("is deterministic and terminally reconciles all 43",async()=>{const first=await materializeAlternativeEvidence(),second=await materializeAlternativeEvidence();expect(first).toEqual(second);expect(first.totals.admittedNextBatch+first.totals.rejected+first.totals.conflicted+first.totals.unknown).toBe(43);expect(first.activationBoundary).toMatchObject({activePointerWrite:false,runtimeMutation:false,databaseMutation:false,productionMutation:false,deployment:false,push:false});});
 it("proposes only newly closed alternatives",async()=>{const result=await materializeAlternativeEvidence();expect(result.categories.every(row=>row.membershipEffect.afterNextBatchProposal===row.membershipEffect.afterExact15+row.admittedNextBatch)).toBe(true);expect(result.categories.every(row=>row.rejected+row.conflicted+row.unknown+row.admittedNextBatch>0)).toBe(true);});
});
