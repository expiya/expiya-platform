import {describe,expect,it} from "vitest";
import {evaluateFactProvenance,type TaxonomyFactProvenance} from "./taxonomy/provenance";
import type {UsedTaxonomySource} from "./taxonomy/sourcePolicy";
const source:UsedTaxonomySource={id:"official-1",authority:"OFFICIAL",usagePermission:"PUBLIC_FACTS_ONLY",reviewedAt:"2026-08-01T00:00:00.000Z",marketApplicability:"TR",automatedAcquisitionApproved:false};
const fact:TaxonomyFactProvenance={factId:"f1",entityId:"e1",kind:"TR_MARKET_AVAILABILITY",sourceIds:[source.id],observedAt:"2026-08-01T00:00:00.000Z",confidence:"HIGH",moderatorStatus:"APPROVED"};
describe("taxonomy fact provenance",()=>{
 it("publishes an approved fact backed by a permitted source",()=>expect(evaluateFactProvenance({fact,sources:[source],now:"2026-09-01T00:00:00.000Z"})).toEqual({publishable:true,codes:[]}));
 it("rejects missing, unknown and dealer-only evidence",()=>{expect(evaluateFactProvenance({fact:{...fact,sourceIds:[]},sources:[],now:"2026-09-01T00:00:00.000Z"}).codes).toContain("NO_SOURCE");expect(evaluateFactProvenance({fact:{...fact,sourceIds:["missing"]},sources:[],now:"2026-09-01T00:00:00.000Z"}).codes).toContain("UNKNOWN_SOURCE");expect(evaluateFactProvenance({fact:{...fact,sourceIds:["dealer"]},sources:[{...source,id:"dealer",authority:"DEALER_SUBMISSION"}],now:"2026-09-01T00:00:00.000Z"}).codes).toContain("DEALER_ONLY_EVIDENCE");});
 it("fails closed on conflict and low confidence",()=>{expect(evaluateFactProvenance({fact:{...fact,moderatorStatus:"CONFLICT"},sources:[source],now:"2026-09-01T00:00:00.000Z"}).publishable).toBe(false);expect(evaluateFactProvenance({fact:{...fact,confidence:"LOW"},sources:[source],now:"2026-09-01T00:00:00.000Z"}).publishable).toBe(false);});
});
